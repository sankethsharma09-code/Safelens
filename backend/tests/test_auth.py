import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_lifecycle():
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123!"
    full_name = "Alex Mercer"

    # 1. Sign up
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": unique_email, "password": password, "full_name": full_name},
    )
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert "token" in signup_data
    assert signup_data["user"]["email"] == unique_email
    assert signup_data["user"]["full_name"] == full_name

    initial_token = signup_data["token"]

    # 2. Duplicate sign up should fail
    dup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": unique_email, "password": password, "full_name": full_name},
    )
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Sign in with wrong password
    bad_signin = client.post(
        "/api/v1/auth/signin",
        json={"email": unique_email, "password": "WrongPassword!"},
    )
    assert bad_signin.status_code == 401

    # 4. Sign in with correct password
    good_signin = client.post(
        "/api/v1/auth/signin",
        json={"email": unique_email, "password": password},
    )
    assert good_signin.status_code == 200
    signin_token = good_signin.json()["token"]

    # 5. Get current profile using Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {signin_token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == unique_email
    assert me_data["full_name"] == full_name

    # 6. Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {signin_token}"},
    )
    assert logout_res.status_code == 200

    # 7. Accessing /me after logout should return 401
    post_logout_me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {signin_token}"},
    )
    assert post_logout_me.status_code == 401
