"""Tests for logout, token revocation and throttling.

Before this, a refresh token could not be revoked at all: there was no logout
endpoint and a password change left every outstanding token working.
"""

from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

User = get_user_model()

PASSWORD = "StrongPass123!"


class TokenRevocationTests(APITestCase):
    def setUp(self):
        self.email = "revoke@example.com"
        self.user = User.objects.create_user(
            email=self.email, username=self.email, password=PASSWORD
        )
        cache.clear()

    def obtain_tokens(self):
        response = self.client.post(
            "/api/token/",
            {"email": self.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["access"], response.data["refresh"]

    def test_refresh_works_before_logout(self):
        _, refresh = self.obtain_tokens()
        response = self.client.post(
            "/api/token/refresh/", {"refresh": refresh}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_revokes_the_refresh_token(self):
        access, refresh = self.obtain_tokens()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        logout = self.client.post(
            "/api/token/logout/", {"refresh": refresh}, format="json"
        )
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

        response = self.client.post(
            "/api/token/refresh/", {"refresh": refresh}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_all_revokes_every_session(self):
        _, refresh_one = self.obtain_tokens()
        access_two, refresh_two = self.obtain_tokens()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_two}")
        logout = self.client.post("/api/token/logout/", {"all": True}, format="json")
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

        for token in (refresh_one, refresh_two):
            response = self.client.post(
                "/api/token/refresh/", {"refresh": token}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_authentication(self):
        response = self.client.post("/api/token/logout/", {"all": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_a_token_is_a_400(self):
        access, _ = self.obtain_tokens()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.post("/api/token/logout/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_changing_the_password_revokes_outstanding_tokens(self):
        access, refresh = self.obtain_tokens()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(
            "/api/v1/profile/change-password/",
            {
                "current_password": PASSWORD,
                "new_password": "EvenStronger456!",
                "confirm_password": "EvenStronger456!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        refreshed = self.client.post(
            "/api/token/refresh/", {"refresh": refresh}, format="json"
        )
        self.assertEqual(
            refreshed.status_code,
            status.HTTP_401_UNAUTHORIZED,
            msg="a password change must not leave old refresh tokens working",
        )


class RefreshCookieTests(APITestCase):
    """The browser flow: X-Use-Refresh-Cookie moves the refresh token into an
    HttpOnly cookie instead of the JSON body, so page JavaScript never has a
    copy of it. Everything in TokenRevocationTests above proves the default,
    unflagged behaviour is untouched - these prove the opt-in transport.
    """

    COOKIE_HEADER = {"HTTP_X_USE_REFRESH_COOKIE": "1"}

    def setUp(self):
        self.email = "cookie@example.com"
        self.user = User.objects.create_user(
            email=self.email, username=self.email, password=PASSWORD
        )
        cache.clear()

    def test_login_with_the_header_omits_refresh_from_the_body(self):
        response = self.client.post(
            "/api/token/",
            {"email": self.email, "password": PASSWORD},
            format="json",
            **self.COOKIE_HEADER,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertIn("pft_refresh", response.cookies)
        cookie = response.cookies["pft_refresh"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Strict")
        self.assertEqual(cookie["path"], "/api/token/")

    def test_login_without_the_header_is_unchanged(self):
        response = self.client.post(
            "/api/token/", {"email": self.email, "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", response.data)
        self.assertNotIn("pft_refresh", response.cookies)

    def test_refresh_via_cookie_alone_works_with_no_body(self):
        login = self.client.post(
            "/api/token/",
            {"email": self.email, "password": PASSWORD},
            format="json",
            **self.COOKIE_HEADER,
        )
        # The test client persists cookies across requests on the same
        # instance, exactly like a browser would.
        response = self.client.post("/api/token/refresh/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        # Rotation keeps re-cookying the new refresh token without needing the
        # header again - cookie-in implies cookie-out.
        self.assertIn("pft_refresh", response.cookies)
        self.assertNotEqual(
            response.cookies["pft_refresh"].value,
            login.cookies["pft_refresh"].value,
        )

    def test_refresh_with_no_cookie_and_no_body_is_401_not_403(self):
        # Regression: TokenViewBase overrides get_authenticate_header so DRF
        # does not coerce this into a 403 when authentication_classes is empty.
        response = self.client.post("/api/token/refresh/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_via_cookie_clears_it(self):
        login = self.client.post(
            "/api/token/",
            {"email": self.email, "password": PASSWORD},
            format="json",
            **self.COOKIE_HEADER,
        )
        access = login.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        logout = self.client.post("/api/token/logout/", {}, format="json")
        self.assertEqual(logout.status_code, status.HTTP_200_OK)
        self.assertEqual(logout.cookies["pft_refresh"].value, "")

        # The now-blacklisted, cookie-carried refresh token cannot be reused.
        refreshed = self.client.post("/api/token/refresh/", {}, format="json")
        self.assertEqual(refreshed.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cookie_refresh_token_is_never_exposed_in_a_response_body(self):
        # Belt and suspenders on the core security property: grep every
        # response body in the whole flow for the raw refresh token value.
        login = self.client.post(
            "/api/token/",
            {"email": self.email, "password": PASSWORD},
            format="json",
            **self.COOKIE_HEADER,
        )
        refresh_value = login.cookies["pft_refresh"].value
        self.assertNotIn(refresh_value, login.content.decode())

        refreshed = self.client.post("/api/token/refresh/", {}, format="json")
        self.assertNotIn(refresh_value, refreshed.content.decode())
        new_refresh_value = refreshed.cookies["pft_refresh"].value
        self.assertNotIn(new_refresh_value, refreshed.content.decode())


class ThrottleTests(APITestCase):
    """Rate limits on the endpoints worth guessing against.

    Note: SimpleRateThrottle.THROTTLE_RATES is bound at import time, so
    override_settings(REST_FRAMEWORK=...) does not reach it. Patch the bound
    dict instead.
    """

    def setUp(self):
        cache.clear()
        self.rates = mock.patch.dict(
            SimpleRateThrottle.THROTTLE_RATES,
            {
                "register": "2/hour",
                "login": "2/min",
                "password_change": "2/min",
                "admin_login": "2/min",
            },
        )
        self.rates.start()
        self.addCleanup(self.rates.stop)
        self.addCleanup(cache.clear)

    def test_registration_is_throttled(self):
        statuses = [
            self.client.post(
                "/api/v1/register/",
                {
                    "email": f"throttle{index}@example.com",
                    "password": PASSWORD,
                    "confirm_password": PASSWORD,
                },
                format="json",
            ).status_code
            for index in range(4)
        ]

        self.assertEqual(statuses[:2], [status.HTTP_201_CREATED] * 2)
        self.assertIn(
            status.HTTP_429_TOO_MANY_REQUESTS,
            statuses,
            msg=f"registration was never throttled: {statuses}",
        )

    def test_login_is_throttled(self):
        User.objects.create_user(
            email="login@example.com", username="login@example.com", password=PASSWORD
        )
        statuses = [
            self.client.post(
                "/api/token/",
                {"email": "login@example.com", "password": "wrong-password"},
                format="json",
            ).status_code
            for _ in range(4)
        ]

        self.assertIn(
            status.HTTP_429_TOO_MANY_REQUESTS,
            statuses,
            msg=f"login was never throttled: {statuses}",
        )

    def test_admin_login_is_throttled(self):
        # django.contrib.admin is a plain Django view, not a DRF one, so this
        # exercises pft/admin_throttle.py rather than REST_FRAMEWORK's
        # throttle_classes - see SECURITY.md's former "not rate limited" note.
        statuses = [
            self.client.post(
                "/admin/login/",
                {"username": "nobody@example.com", "password": "wrong-password"},
            ).status_code
            for _ in range(4)
        ]

        self.assertIn(
            status.HTTP_429_TOO_MANY_REQUESTS,
            statuses,
            msg=f"admin login was never throttled: {statuses}",
        )

    def test_admin_login_get_is_never_throttled(self):
        # Only credential submissions count - merely viewing the form must
        # not burn through a visitor's attempt budget.
        statuses = [self.client.get("/admin/login/").status_code for _ in range(10)]
        self.assertNotIn(status.HTTP_429_TOO_MANY_REQUESTS, statuses)

    def test_admin_login_throttle_is_scoped_by_ip(self):
        credentials = {"username": "nobody@example.com", "password": "wrong-password"}

        # Exhaust the budget for one IP...
        for _ in range(2):
            self.client.post("/admin/login/", credentials, REMOTE_ADDR="203.0.113.5")
        exhausted = self.client.post(
            "/admin/login/", credentials, REMOTE_ADDR="203.0.113.5"
        )
        self.assertEqual(exhausted.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # ...a different IP is unaffected, proving these are separate counters
        # rather than one global one.
        other_ip = self.client.post(
            "/admin/login/", credentials, REMOTE_ADDR="198.51.100.7"
        )
        self.assertEqual(other_ip.status_code, status.HTTP_200_OK)
