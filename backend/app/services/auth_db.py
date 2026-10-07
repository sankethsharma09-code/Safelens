import sqlite3
import hashlib
import secrets
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "safelens_auth.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db() -> None:
    """Initializes the SQLite tables for users and session tokens."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_tokens (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id)")
    finally:
        conn.close()


def hash_password(password: str, salt: Optional[bytes] = None) -> tuple[str, str]:
    """Hashes password with PBKDF2-HMAC-SHA256 and salt."""
    if salt is None:
        salt = secrets.token_bytes(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return hashed.hex(), salt.hex()


def verify_password(password: str, stored_hash_hex: str, salt_hex: str) -> bool:
    """Verifies a password against the stored hash and salt."""
    salt = bytes.fromhex(salt_hex)
    computed_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000).hex()
    return secrets.compare_digest(computed_hash, stored_hash_hex)


def create_user(email: str, password: str, full_name: str) -> dict:
    """Creates a new user and generates an initial session token."""
    clean_email = email.strip().lower()
    clean_name = full_name.strip() or clean_email.split("@")[0]

    password_hash, password_salt = hash_password(password)
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO users (id, email, full_name, password_hash, password_salt, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, clean_email, clean_name, password_hash, password_salt, now),
            )
    except sqlite3.IntegrityError:
        raise ValueError("An account with this email already exists.")
    finally:
        conn.close()

    token = create_user_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": clean_email,
            "full_name": clean_name,
            "created_at": now,
        },
    }


def authenticate_user(email: str, password: str) -> dict:
    """Authenticates a user with email and password."""
    clean_email = email.strip().lower()
    conn = get_db_connection()
    try:
        cursor = conn.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Invalid email or password.")

        if not verify_password(password, row["password_hash"], row["password_salt"]):
            raise ValueError("Invalid email or password.")

        user_id = row["id"]
        full_name = row["full_name"]
        created_at = row["created_at"]
    finally:
        conn.close()

    token = create_user_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": clean_email,
            "full_name": full_name,
            "created_at": created_at,
        },
    }


def create_user_token(user_id: str, days_valid: int = 30) -> str:
    """Creates a session token for the user valid for N days."""
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=days_valid)).isoformat()

    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO user_tokens (token, user_id, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                """,
                (token, user_id, now.isoformat(), expires_at),
            )
    finally:
        conn.close()

    return token


def get_user_by_token(token: str) -> Optional[dict]:
    """Retrieves a user by active session token."""
    clean_token = token.strip()
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    try:
        cursor = conn.execute(
            """
            SELECT u.id, u.email, u.full_name, u.created_at
            FROM users u
            JOIN user_tokens t ON u.id = t.user_id
            WHERE t.token = ? AND t.expires_at > ?
            """,
            (clean_token, now),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "email": row["email"],
            "full_name": row["full_name"],
            "created_at": row["created_at"],
        }
    finally:
        conn.close()


def revoke_token(token: str) -> None:
    """Invalidates a session token upon logout."""
    clean_token = token.strip()
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("DELETE FROM user_tokens WHERE token = ?", (clean_token,))
    finally:
        conn.close()


def get_or_create_google_user(email: str, full_name: str | None = None) -> dict:
    """Gets existing user by Google email or creates a new one, returning a session token."""
    clean_email = email.strip().lower()
    clean_name = (full_name or "").strip() or clean_email.split("@")[0]
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    try:
        cursor = conn.execute(
            "SELECT id, email, full_name, created_at FROM users WHERE email = ?",
            (clean_email,),
        )
        row = cursor.fetchone()
        if row:
            user_id = row["id"]
            user_email = row["email"]
            user_name = row["full_name"] or clean_name
            created_at = row["created_at"]
        else:
            user_id = str(uuid.uuid4())
            random_pw = secrets.token_urlsafe(32)
            pw_hash, pw_salt = hash_password(random_pw)
            with conn:
                conn.execute(
                    """
                    INSERT INTO users (id, email, full_name, password_hash, password_salt, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (user_id, clean_email, clean_name, pw_hash, pw_salt, now),
                )
            user_email = clean_email
            user_name = clean_name
            created_at = now
    finally:
        conn.close()

    token = create_user_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_email,
            "full_name": user_name,
            "created_at": created_at,
        },
    }

