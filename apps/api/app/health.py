from django.conf import settings
from django.db import connection
from django.http import JsonResponse


def healthz(request):
    """Liveness/readiness probe: reports whether the database is reachable.

    Intentionally unauthenticated and free of any user data - it is what the
    container healthcheck and any uptime monitor calls. `demo` lets the
    frontend show a banner without needing its own authenticated call - see
    pft/demo_mode.py.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return JsonResponse({"status": "error", "database": "unavailable"}, status=503)

    payload = {"status": "ok", "database": "ok", "demo": settings.FINTRACK_DEMO_MODE}
    if settings.FINTRACK_DEMO_MODE:
        # Not a secret - it is the whole point of a public demo - so it is
        # fine to hand out unauthenticated alongside the rest of this probe.
        payload["demo_email"] = settings.FINTRACK_DEMO_EMAIL
    return JsonResponse(payload)
