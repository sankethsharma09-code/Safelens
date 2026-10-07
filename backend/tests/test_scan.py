import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "qr_scanner" in data["features"]
    assert "text_analyzer" in data["features"]


def test_device_registration():
    response = client.post("/api/v1/devices/register", json={"platform": "windows", "app_version": "0.1.0"})
    assert response.status_code == 200
    data = response.json()
    assert "device_id" in data
    assert "token" in data


def test_scan_qr_phishing():
    payload = {
        "items": [
            {"kind": "qr", "value": "https://secure-login.bank-update.xyz/verify"}
        ],
        "context": {"language": "en"}
    }
    response = client.post("/api/v1/scan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["overall"]["verdict"] in ("Dangerous", "Suspicious")
    assert data["overall"]["score"] >= 50
    assert len(data["items"]) == 1
    assert data["items"][0]["kind"] == "qr"
    assert "Do NOT visit" in data["recommendedAction"] or "Verify" in data["recommendedAction"]


def test_scan_text_urgency_kyc():
    payload = {
        "items": [
            {"kind": "text", "value": "URGENT: Your account has been suspended. Update KYC immediately or pay fine."}
        ],
        "context": {"language": "en"}
    }
    response = client.post("/api/v1/scan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["overall"]["verdict"] == "Dangerous"
    assert data["overall"]["score"] >= 60
    assert len(data["items"]) >= 1
    assert data["items"][0]["kind"] == "text"


def test_scan_safe_content():
    payload = {
        "items": [
            {"kind": "text", "value": "The conference meeting is scheduled for tomorrow at 10 AM in Room 302."}
        ],
        "context": {"language": "en"}
    }
    response = client.post("/api/v1/scan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["overall"]["verdict"] == "Safe"
    assert data["overall"]["score"] < 25


def test_reject_unsupported_item_kind():
    """Verify that unsupported item kinds (like legacy 'upi' or 'phone') return 400 Bad Request."""
    payload = {
        "items": [
            {"kind": "upi", "value": "upi://pay?pa=scammer@upi&pn=Payee"}
        ],
        "context": {"language": "en"}
    }
    response = client.post("/api/v1/scan", json=payload)
    assert response.status_code == 400
