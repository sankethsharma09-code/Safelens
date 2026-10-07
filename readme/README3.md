# SafeLens Database Architecture

Storage specifications for SafeLens, scoped strictly to **QR Code Scanning** and **Text Analysis**.

---

## Data Stores

| Store | Location | Purpose |
|---|---|---|
| **PostgreSQL** | Server | Devices, scan records (keyed hashes), threat indicators, scam rule engine |
| **Redis** | Server | High-speed URL verdict cache, rate limiting |
| **SQLite** | Desktop Client | Local settings (hotkey, screen shield) and optional verdict cache |

---

## Privacy Architecture

1. **No Image Storage**: Screenshots exist purely in memory on the desktop machine during snipping and are cleared immediately upon cropping. No image files or pixels are stored in any database.
2. **Keyed Hashing**: Scanned values are stored as HMAC-SHA-256 hashes using a secret salt (`HASH_PEPPER`). Raw content is never stored on the server.
3. **No History Tracking**: The desktop client does not maintain a persistent local scan history table, ensuring that private or sensitive on-screen snippets cannot be harvested from disk.
4. **Retention**: Scan audit logs (`scans`, `scan_items`) are automatically pruned via a 30-day retention schedule.

---

## PostgreSQL Schema (Server)

```sql
-- Devices table: anonymous device registration
CREATE TABLE devices (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform     text NOT NULL CHECK (platform IN ('windows', 'macos', 'linux')),
    app_version  text,
    token_hash   text NOT NULL UNIQUE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz
);

-- Scans table: audit records of scan queries
CREATE TABLE scans (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    overall_verdict text NOT NULL CHECK (overall_verdict IN ('Safe', 'Suspicious', 'Dangerous')),
    overall_score   smallint NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    partial         boolean NOT NULL DEFAULT false,
    latency_ms      integer,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scans_device_created_idx ON scans (device_id, created_at DESC);
CREATE INDEX scans_created_idx ON scans (created_at);

-- Scan Items: Extracted items (limited to 'qr', 'text', and embedded 'url')
CREATE TABLE scan_items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id       uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    kind          text NOT NULL CHECK (kind IN ('qr', 'text', 'url')),
    value_hash    text NOT NULL,                        -- HMAC-SHA-256(value, HASH_PEPPER)
    verdict       text NOT NULL CHECK (verdict IN ('Safe', 'Suspicious', 'Dangerous')),
    score         smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
    flags         jsonb NOT NULL DEFAULT '[]',          -- [{"label": "...", "detail": "..."}]
    explanation   text,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scan_items_scan_idx ON scan_items (scan_id);
CREATE INDEX scan_items_hash_idx ON scan_items (value_hash);

-- Threat Indicators: Known malicious domains, URLs, and phishing patterns
CREATE TABLE indicators (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type             text NOT NULL CHECK (type IN ('url', 'domain')),
    value_normalized text NOT NULL,
    value_hash       text NOT NULL,
    reputation       text NOT NULL CHECK (reputation IN ('malicious', 'suspicious', 'safe')),
    source           text NOT NULL CHECK (source IN ('safe_browsing', 'virustotal', 'phishtank', 'urlhaus', 'manual')),
    confidence       real NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    first_seen_at    timestamptz NOT NULL DEFAULT now(),
    last_seen_at     timestamptz NOT NULL DEFAULT now(),
    expires_at       timestamptz,
    UNIQUE (type, value_hash, source)
);
CREATE INDEX indicators_lookup_idx ON indicators (type, value_hash);

-- Scam Rules: Configurable regex and heuristic patterns for text phishing & urgency
CREATE TABLE scam_rules (
    id         serial PRIMARY KEY,
    label      text NOT NULL,
    pattern    text NOT NULL,
    weight     smallint NOT NULL CHECK (weight BETWEEN 1 AND 100),
    language   text NOT NULL DEFAULT 'any',
    enabled    boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Automatic Retention Cleanup

```sql
-- Daily maintenance job
DELETE FROM scans WHERE created_at < now() - interval '30 days';
DELETE FROM indicators WHERE expires_at IS NOT NULL AND expires_at < now();
```

---

## Redis (Server Caching)

| Key Pattern | Data | TTL |
|---|---|---|
| `url:v1:{value_hash}` | JSON verdict `{verdict, score, flags}` | 1h for Safe, 24h for Dangerous |
| `rl:{device_id}:{minute}` | Request rate limit counter | 60 seconds |

---

## SQLite (Desktop Client, Local)

Stored in the user profile directory (`app.getPath('userData')/safelens.db`).

```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,                             -- 'hotkey', 'content_protection', ...
    value TEXT NOT NULL
);

CREATE TABLE verdict_cache (                            -- optional client cache for repeated scans
    key        TEXT PRIMARY KEY,                        -- SHA-256 hash of normalized payload
    verdict    TEXT NOT NULL,
    score      INTEGER NOT NULL,
    flags_json TEXT NOT NULL DEFAULT '[]',
    expires_at TEXT NOT NULL
);
```

> **Note**: The client maintains **no scan history table**. Device authentication tokens are kept securely in the OS keychain via Electron `safeStorage`.
