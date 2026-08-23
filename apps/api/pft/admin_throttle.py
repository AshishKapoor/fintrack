"""Rate limiting for the Django admin login.

`django.contrib.admin` is a set of plain Django views, not DRF views, so it
never goes through REST_FRAMEWORK's throttle classes the way `/api/token/` and
`/api/v1/register/` do - this used to be called out in SECURITY.md as a known
gap ("limit it at your reverse proxy, or do not expose it"). This reuses DRF's
own SimpleRateThrottle (IP resolution respecting NUM_PROXIES, rate parsing,
cache-based sliding window) so the admin login shares the exact same
semantics as every other throttled auth endpoint, just scoped to
"admin_login" and wired in as middleware instead of a `throttle_classes` list.
"""

from django.http import HttpResponse
from django.urls import NoReverseMatch, reverse
from rest_framework.throttling import SimpleRateThrottle


class AdminLoginRateThrottle(SimpleRateThrottle):
    scope = "admin_login"

    def get_cache_key(self, request, view=None):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class AdminLoginThrottleMiddleware:
    """429s a POST to the admin login once THROTTLE_ADMIN_LOGIN is exceeded."""

    def __init__(self, get_response):
        self.get_response = get_response
        self._login_path = None

    @property
    def login_path(self):
        # Lazy + cached: reverse() needs the URLconf loaded, which is not
        # guaranteed yet when middleware instances are constructed at startup,
        # but always is by the time a request is actually being handled.
        if self._login_path is None:
            try:
                self._login_path = reverse("admin:login")
            except NoReverseMatch:
                # The admin site isn't wired up - nothing to protect.
                self._login_path = ""
        return self._login_path

    def __call__(self, request):
        if (
            request.method == "POST"
            and self.login_path
            and request.path == self.login_path
        ):
            throttle = AdminLoginRateThrottle()
            if not throttle.allow_request(request, view=None):
                retry_after = throttle.wait()
                response = HttpResponse(
                    "Too many login attempts. Try again later.",
                    status=429,
                    content_type="text/plain",
                )
                if retry_after is not None:
                    response["Retry-After"] = str(int(retry_after))
                return response

        return self.get_response(request)
