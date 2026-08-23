"""Read-only enforcement for the public demo instance.

See docker-compose.demo.yml and ROADMAP.md's "Live demo instance" item. With
FINTRACK_DEMO_MODE on, every mutating request is rejected instance-wide
except the handful needed to sign in with the shared, seeded demo account -
nobody can register their own account, change the demo's data, or reach the
Django admin at all. `pft/tasks.py:reset_demo_data_task` then rebuilds that
account from scratch on an hourly beat schedule, so the blast radius of
"someone found a way to change something anyway" is capped at an hour.

This is deliberately a blunt, instance-wide middleware rather than per-view
permission checks: the whole point is that nobody has to remember to guard a
new endpoint against demo mode - it is guarded by construction.
"""

import re

from django.conf import settings
from django.http import JsonResponse

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

# Exact paths a signed-out visitor still needs to hit to use the shared demo
# account, plus the report "run" actions - both POST, neither one writes
# anything (see ReportViewSet.run_adhoc/run_saved in finance_views.py): they
# compute a result from existing data and return it, same as a GET in every
# way except that the report parameters do not fit comfortably in one. The
# dashboard itself depends on the unsaved-report variant, so getting this
# allowlist wrong does not just block a nice-to-have, it breaks the demo's
# own charts. Nothing else accepts a mutating method in demo mode, no matter
# what gets added to the API later.
ALLOWED_MUTATIONS = {
    "/api/token/",
    "/api/token/refresh/",
    "/api/token/logout/",
    "/api/v1/finance/reports/run/",
}
ALLOWED_MUTATION_PATTERNS = (re.compile(r"^/api/v1/finance/reports/\d+/run/$"),)


def _is_allowed_mutation(path: str) -> bool:
    if path in ALLOWED_MUTATIONS:
        return True
    return any(pattern.match(path) for pattern in ALLOWED_MUTATION_PATTERNS)


class DemoModeMiddleware:
    """403s any mutation outside the sign-in flow when FINTRACK_DEMO_MODE is on."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.FINTRACK_DEMO_MODE:
            # No legitimate reason for a public demo to expose the admin at
            # all - not even the login form DRF's own throttling protects.
            if request.path.startswith("/admin/"):
                return JsonResponse(
                    {"detail": "The admin is disabled on this demo instance."},
                    status=403,
                )
            if request.method not in SAFE_METHODS and not _is_allowed_mutation(
                request.path
            ):
                return JsonResponse(
                    {
                        "detail": (
                            "This is a read-only demo instance. Data resets "
                            "hourly and cannot be changed - self-host FinTrack "
                            "to use it for real."
                        )
                    },
                    status=403,
                )

        return self.get_response(request)
