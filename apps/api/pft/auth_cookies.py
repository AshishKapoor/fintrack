"""HttpOnly refresh-token cookie helpers.

Browser clients that send the `X-Use-Refresh-Cookie` header to `/api/token/`,
`/api/token/refresh/` and `/api/token/logout/` get their refresh token
delivered as an HttpOnly cookie instead of in the JSON response body, so page
JavaScript - and therefore an XSS payload - never has a copy of it. The access
token is never cookied; the frontend holds it in memory only and re-derives it
from the refresh cookie on page load.

Once a refresh token has arrived via the cookie, `CookieTokenRefreshView`
keeps rotating it back into a cookie on every subsequent call even if the
header is omitted - cookie-in implies cookie-out. Callers that never send the
header or a cookie (the official SDKs, scripts, existing tests) keep getting
`refresh` in the body exactly as before: this mechanism is purely additive and
does not change the default API contract.

See SECURITY.md ("Known limitations") and ARCHITECTURE.md ("Authentication")
for the threat model this addresses.
"""

from django.conf import settings

REFRESH_COOKIE_NAME = "pft_refresh"
# Scoped to the token endpoints only. The cookie would otherwise be dead
# weight on every other API call, which authenticates via the Authorization
# header instead.
REFRESH_COOKIE_PATH = "/api/token/"

_TRUTHY = {"1", "true", "yes"}


def wants_refresh_cookie(request) -> bool:
    """Whether the caller opted into the HttpOnly-cookie transport."""
    value = request.headers.get("X-Use-Refresh-Cookie", "")
    return value.strip().lower() in _TRUTHY


def set_refresh_cookie(response, token) -> None:
    max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        str(token),
        max_age=max_age,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )
