"""Backend integration tests for TrackMP.

Covers: health, auth, signup requests + moderation, reference data,
politicians CRUD + hydration, wealth/relatives, admin management,
role guards, audit log, soft-delete + trash restore/purge.
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://audit-platform-32.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SUPER_EMAIL = "admin@trackmp.com"
SUPER_PASS = "!Gj@#2&~01$99*Ms"


# ----- Fixtures -----
@pytest.fixture(scope="session")
def super_token():
    r = requests.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS}, timeout=15)
    assert r.status_code == 200, f"super admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def us_country_code():
    r = requests.get(f"{API}/ref/countries", timeout=15)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 195, f"expected >=195 countries, got {len(items)}"
    codes = {c["code"] for c in items}
    assert "US" in codes
    return "US"


# ----- Health -----
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# ----- Auth -----
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "super_admin"
        assert d["email"] == SUPER_EMAIL
        assert isinstance(d.get("access_token"), str) and len(d["access_token"]) > 10
        assert "id" in d

    def test_login_invalid_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": "wrongpass"}, timeout=15)
        assert r.status_code == 401

    def test_me_bearer(self, super_headers):
        r = requests.get(f"{API}/auth/me", headers=super_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == SUPER_EMAIL
        assert d["role"] == "super_admin"

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_logout(self, super_headers):
        r = requests.post(f"{API}/auth/logout", headers=super_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_providers_public(self):
        r = requests.get(f"{API}/auth/providers", timeout=15)
        assert r.status_code == 200
        providers = r.json()["providers"]
        # All should be disabled (social scaffolding)
        assert isinstance(providers, list)


# ----- Signup Requests -----
class TestSignupRequests:
    _created_ids = []

    def test_create_signup_valid(self, us_country_code):
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/signup-requests", json={
            "full_name": "TEST User One",
            "email": email,
            "country_code": us_country_code,
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        self.__class__._created_ids.append((data.get("id"), email))

    def test_duplicate_pending_no_dup(self, us_country_code, super_headers):
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"full_name": "TEST Dup", "email": email, "country_code": us_country_code}
        r1 = requests.post(f"{API}/signup-requests", json=payload, timeout=15)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/signup-requests", json=payload, timeout=15)
        assert r2.status_code == 200
        # Verify only one pending
        r3 = requests.get(f"{API}/admin/signup-requests?status=pending", headers=super_headers, timeout=15)
        assert r3.status_code == 200
        matches = [x for x in r3.json()["items"] if x["email"] == email.lower()]
        assert len(matches) == 1, f"expected 1 pending, got {len(matches)}"

    def test_invalid_country_code(self):
        r = requests.post(f"{API}/signup-requests", json={
            "full_name": "TEST BadCountry",
            "email": f"TEST_bad_{uuid.uuid4().hex[:6]}@example.com",
            "country_code": "ZZ",
        }, timeout=15)
        assert r.status_code == 400

    def test_approve_and_invitation_flow(self, super_headers, us_country_code):
        email = f"TEST_approve_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/signup-requests", json={
            "full_name": "TEST Approve", "email": email, "country_code": us_country_code,
        }, timeout=15)
        assert r.status_code == 200

        # find id
        r_list = requests.get(f"{API}/admin/signup-requests?status=pending", headers=super_headers, timeout=15)
        req = next(x for x in r_list.json()["items"] if x["email"] == email.lower())
        req_id = req["id"]

        r_app = requests.post(f"{API}/admin/signup-requests/{req_id}/approve",
                              headers=super_headers, json={"note": "ok"}, timeout=15)
        assert r_app.status_code == 200, r_app.text
        invite_link = r_app.json().get("invite_link")
        assert invite_link and "token=" in invite_link
        token = invite_link.split("token=")[1]

        # Get invitation details (public)
        r_inv = requests.get(f"{API}/auth/invitation/{token}", timeout=15)
        assert r_inv.status_code == 200
        assert r_inv.json()["email"] == email.lower()

        # Register magic
        new_pass = "NewPassw0rd!"
        r_reg = requests.post(f"{API}/auth/register-magic", json={
            "token": token, "password": new_pass, "name": "TEST Approved User",
        }, timeout=15)
        assert r_reg.status_code == 200, r_reg.text
        assert r_reg.json()["email"] == email.lower()
        assert r_reg.json()["role"] == "user"

        # Login as newly registered user
        r_login = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pass}, timeout=15)
        assert r_login.status_code == 200

    def test_reject(self, super_headers, us_country_code):
        email = f"TEST_reject_{uuid.uuid4().hex[:8]}@example.com"
        requests.post(f"{API}/signup-requests", json={
            "full_name": "TEST Reject", "email": email, "country_code": us_country_code,
        }, timeout=15)
        r_list = requests.get(f"{API}/admin/signup-requests?status=pending", headers=super_headers, timeout=15)
        req = next(x for x in r_list.json()["items"] if x["email"] == email.lower())
        req_id = req["id"]
        r_rej = requests.post(f"{API}/admin/signup-requests/{req_id}/reject",
                              headers=super_headers, json={"note": "no"}, timeout=15)
        assert r_rej.status_code == 200
        # No invite token created for rejection (verify by listing rejected)
        r_check = requests.get(f"{API}/admin/signup-requests?status=rejected", headers=super_headers, timeout=15)
        emails = [x["email"] for x in r_check.json()["items"]]
        assert email.lower() in emails


# ----- Reference Data -----
class TestReferenceData:
    def test_countries_seeded(self):
        r = requests.get(f"{API}/ref/countries", timeout=15)
        assert r.status_code == 200
        assert len(r.json()["items"]) >= 195

    def test_state_city_constituency_crud(self, super_headers, us_country_code):
        # Create state
        state_name = f"TEST_State_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/ref/states", headers=super_headers,
                          json={"country_code": us_country_code, "name": state_name}, timeout=15)
        assert r.status_code == 200
        state_id = r.json()["id"]

        # Filter states by country
        r2 = requests.get(f"{API}/ref/states?country_code={us_country_code}", timeout=15)
        assert r2.status_code == 200
        assert any(s["id"] == state_id for s in r2.json()["items"])

        # Create city
        city_name = f"TEST_City_{uuid.uuid4().hex[:6]}"
        r3 = requests.post(f"{API}/ref/cities", headers=super_headers,
                           json={"state_id": state_id, "name": city_name}, timeout=15)
        assert r3.status_code == 200
        city_id = r3.json()["id"]

        r4 = requests.get(f"{API}/ref/cities?state_id={state_id}", timeout=15)
        assert any(c["id"] == city_id for c in r4.json()["items"])

        # Create constituency
        cst_name = f"TEST_CST_{uuid.uuid4().hex[:6]}"
        r5 = requests.post(f"{API}/ref/constituencies", headers=super_headers,
                           json={"state_id": state_id, "city_id": city_id, "name": cst_name}, timeout=15)
        assert r5.status_code == 200
        cst_id = r5.json()["id"]

        # Update state
        r6 = requests.put(f"{API}/ref/states/{state_id}", headers=super_headers,
                         json={"name": state_name + "_UPD"}, timeout=15)
        assert r6.status_code == 200

        # Delete constituency, city, state (soft)
        assert requests.delete(f"{API}/ref/constituencies/{cst_id}", headers=super_headers, timeout=15).status_code == 200
        assert requests.delete(f"{API}/ref/cities/{city_id}", headers=super_headers, timeout=15).status_code == 200
        assert requests.delete(f"{API}/ref/states/{state_id}", headers=super_headers, timeout=15).status_code == 200


# ----- Politicians / Wealth / Relatives -----
class TestPoliticians:
    _pid = None
    _wid = None
    _rid = None

    def test_list_public(self):
        r = requests.get(f"{API}/politicians", timeout=15)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_create_requires_admin(self):
        r = requests.post(f"{API}/politicians", json={"name": "TEST_NoAuth"}, timeout=15)
        assert r.status_code == 401

    def test_create_politician(self, super_headers, us_country_code):
        payload = {
            "name": f"TEST_Politician_{uuid.uuid4().hex[:6]}",
            "country_code": us_country_code,
            "brief_intro": "Test bio for TEST politician.",
        }
        r = requests.post(f"{API}/politicians", headers=super_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        self.__class__._pid = pid

        # GET returns hydrated
        r2 = requests.get(f"{API}/politicians/{pid}", timeout=15)
        assert r2.status_code == 200
        d = r2.json()
        assert d["name"] == payload["name"]
        assert d["brief_intro"] == payload["brief_intro"]
        assert d["wealth"] == []
        assert d["relatives"] == []
        assert "_id" not in d  # ObjectId excluded

    def test_update_politician_partial(self, super_headers):
        pid = self.__class__._pid
        assert pid
        r = requests.put(f"{API}/politicians/{pid}", headers=super_headers,
                         json={"brief_intro": "Updated bio."}, timeout=15)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/politicians/{pid}", timeout=15)
        assert r2.json()["brief_intro"] == "Updated bio."

    def test_add_wealth_net_worth_default(self, super_headers):
        pid = self.__class__._pid
        r = requests.post(f"{API}/politicians/{pid}/wealth", headers=super_headers, json={
            "year": 2021, "assets": 1000, "liabilities": 300,
        }, timeout=15)
        assert r.status_code == 200
        wid = r.json()["id"]
        self.__class__._wid = wid
        # verify hydration
        pol = requests.get(f"{API}/politicians/{pid}", timeout=15).json()
        w = next(x for x in pol["wealth"] if x["id"] == wid)
        assert w["net_worth"] == 700  # 1000-300

    def test_update_wealth(self, super_headers):
        wid = self.__class__._wid
        r = requests.put(f"{API}/wealth/{wid}", headers=super_headers, json={
            "year": 2022, "assets": 2000, "liabilities": 500, "net_worth": 1500,
        }, timeout=15)
        assert r.status_code == 200

    def test_add_relative_and_relative_wealth(self, super_headers):
        pid = self.__class__._pid
        r = requests.post(f"{API}/politicians/{pid}/relatives", headers=super_headers,
                          json={"name": "TEST Cousin", "relationship": "cousin"}, timeout=15)
        assert r.status_code == 200
        rid = r.json()["id"]
        self.__class__._rid = rid

        rw = requests.post(f"{API}/relatives/{rid}/wealth", headers=super_headers,
                           json={"year": 2020, "assets": 500, "liabilities": 100}, timeout=15)
        assert rw.status_code == 200

        # Verify nested hydration
        pol = requests.get(f"{API}/politicians/{pid}", timeout=15).json()
        rel = next(x for x in pol["relatives"] if x["id"] == rid)
        assert len(rel["wealth"]) == 1
        assert rel["wealth"][0]["net_worth"] == 400

    def test_soft_delete_politician(self, super_headers):
        pid = self.__class__._pid
        r = requests.delete(f"{API}/politicians/{pid}", headers=super_headers, timeout=15)
        assert r.status_code == 200
        # Not in list
        r2 = requests.get(f"{API}/politicians?limit=200", timeout=15)
        ids = [p["id"] for p in r2.json()["items"]]
        assert pid not in ids
        # Also individual GET returns 404
        assert requests.get(f"{API}/politicians/{pid}", timeout=15).status_code == 404


# ----- Admin Management -----
class TestAdminManagement:
    def test_create_admin_and_super_guard(self, super_headers):
        # Create regular admin
        email = f"TEST_admin_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/admin/admins", headers=super_headers, json={
            "email": email, "name": "TEST Admin", "password": "AdminPass1!",
        }, timeout=15)
        assert r.status_code == 200
        admin_id = r.json()["id"]

        # Verify listing
        r_l = requests.get(f"{API}/admin/admins", headers=super_headers, timeout=15)
        assert any(u["id"] == admin_id for u in r_l.json()["items"])

        # Update admin
        r_u = requests.put(f"{API}/admin/admins/{admin_id}", headers=super_headers,
                          json={"name": "TEST Admin Renamed"}, timeout=15)
        assert r_u.status_code == 200

        # Login as this admin
        r_l2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "AdminPass1!"}, timeout=15)
        assert r_l2.status_code == 200
        assert r_l2.json()["role"] == "admin"
        admin_tok = r_l2.json()["access_token"]

        # Regular admin cannot access super-admin-only endpoints
        r_forbid = requests.get(f"{API}/admin/admins", headers={"Authorization": f"Bearer {admin_tok}"}, timeout=15)
        assert r_forbid.status_code == 403

        # But regular admin CAN access /api/admin/politicians-style ops (require_admin)
        r_pol = requests.post(f"{API}/politicians", headers={"Authorization": f"Bearer {admin_tok}"},
                              json={"name": f"TEST_by_admin_{uuid.uuid4().hex[:4]}"}, timeout=15)
        assert r_pol.status_code == 200

        # Delete admin
        r_d = requests.delete(f"{API}/admin/admins/{admin_id}", headers=super_headers, timeout=15)
        assert r_d.status_code == 200

    def test_cannot_modify_super_admin(self, super_headers):
        r = requests.get(f"{API}/admin/admins", headers=super_headers, timeout=15)
        super_row = next(u for u in r.json()["items"] if u["email"] == SUPER_EMAIL)
        sid = super_row["id"]
        # PUT
        r_put = requests.put(f"{API}/admin/admins/{sid}", headers=super_headers,
                            json={"name": "hax"}, timeout=15)
        assert r_put.status_code == 403
        # DELETE
        r_del = requests.delete(f"{API}/admin/admins/{sid}", headers=super_headers, timeout=15)
        assert r_del.status_code == 403


# ----- Role Guards -----
class TestRoleGuards:
    def test_unauth_returns_401(self):
        r = requests.get(f"{API}/admin/audit", timeout=15)
        assert r.status_code == 401

    def test_admin_endpoints_require_super(self, super_headers, us_country_code):
        # Create a regular user via signup+approve flow, or just create an admin and demote?
        # Simpler: create signup + approve to get 'user' role token
        email = f"TEST_user_{uuid.uuid4().hex[:6]}@example.com"
        requests.post(f"{API}/signup-requests", json={
            "full_name": "TEST User Guard", "email": email, "country_code": us_country_code,
        }, timeout=15)
        r_list = requests.get(f"{API}/admin/signup-requests?status=pending", headers=super_headers, timeout=15)
        req_id = next(x for x in r_list.json()["items"] if x["email"] == email)["id"]
        r_app = requests.post(f"{API}/admin/signup-requests/{req_id}/approve",
                              headers=super_headers, json={}, timeout=15)
        token = r_app.json()["invite_link"].split("token=")[1]
        requests.post(f"{API}/auth/register-magic", json={"token": token, "password": "UserPass1!"}, timeout=15)
        r_login = requests.post(f"{API}/auth/login", json={"email": email, "password": "UserPass1!"}, timeout=15)
        assert r_login.status_code == 200
        user_tok = r_login.json()["access_token"]
        assert r_login.json()["role"] == "user"

        # User cannot access admin routes
        hdr = {"Authorization": f"Bearer {user_tok}"}
        assert requests.get(f"{API}/admin/audit", headers=hdr, timeout=15).status_code == 403
        assert requests.get(f"{API}/admin/trash", headers=hdr, timeout=15).status_code == 403
        assert requests.post(f"{API}/politicians", headers=hdr, json={"name": "x"}, timeout=15).status_code == 403


# ----- Audit Log -----
class TestAuditLog:
    def test_audit_list_and_filter(self, super_headers):
        r = requests.get(f"{API}/admin/audit?limit=50", headers=super_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) > 0
        # Filter by entity_type
        r2 = requests.get(f"{API}/admin/audit?entity_type=politician&limit=50", headers=super_headers, timeout=15)
        assert r2.status_code == 200
        for x in r2.json()["items"]:
            assert x["entity_type"] == "politician"
        # Filter by action
        r3 = requests.get(f"{API}/admin/audit?action=login&limit=20", headers=super_headers, timeout=15)
        assert r3.status_code == 200
        for x in r3.json()["items"]:
            assert x["action"] == "login"


# ----- Trash: restore + purge -----
class TestTrash:
    def test_trash_restore_purge_country(self, super_headers):
        # Create a country to soft-delete
        code = f"T{uuid.uuid4().hex[:1].upper()}"
        name = f"TEST_Country_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/ref/countries", headers=super_headers,
                         json={"code": code, "name": name}, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        # Soft-delete
        assert requests.delete(f"{API}/ref/countries/{cid}", headers=super_headers, timeout=15).status_code == 200
        # Appears in trash
        r_trash = requests.get(f"{API}/admin/trash?entity_type=country", headers=super_headers, timeout=15)
        assert r_trash.status_code == 200
        assert any(x["entity_id"] == cid for x in r_trash.json()["items"])
        # Restore
        r_r = requests.post(f"{API}/admin/trash/restore", headers=super_headers,
                           json={"entity_type": "country", "entity_id": cid}, timeout=15)
        assert r_r.status_code == 200
        # Soft-delete again for purge
        requests.delete(f"{API}/ref/countries/{cid}", headers=super_headers, timeout=15)
        # Purge mismatch
        r_bad = requests.post(f"{API}/admin/trash/purge", headers=super_headers,
                              json={"entity_type": "country", "entity_id": cid, "confirm_name": "wrong"}, timeout=15)
        assert r_bad.status_code == 400
        # Purge success
        r_ok = requests.post(f"{API}/admin/trash/purge", headers=super_headers,
                             json={"entity_type": "country", "entity_id": cid, "confirm_name": name}, timeout=15)
        assert r_ok.status_code == 200
