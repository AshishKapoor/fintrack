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
            {"register": "2/hour", "login": "2/min", "password_change": "2/min"},
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
