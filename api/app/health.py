from django.db import connection
from django.http import JsonResponse


def healthz(request):
    """Liveness/readiness probe: reports whether the database is reachable.

    Intentionally unauthenticated and free of any user data - it is what the
    container healthcheck and any uptime monitor calls.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return JsonResponse({"status": "error", "database": "unavailable"}, status=503)

    return JsonResponse({"status": "ok", "database": "ok"})
