#!/bin/sh
# Fail when web/schema/pft.yaml no longer matches what the backend generates.
# The committed schema drives the generated SDK (web/app/client/gen), so drift
# here means the SDK is lying about the API. Run from api/ with deps synced.
set -e

GENERATED="$(mktemp)"
GENLOG="$(mktemp)"
trap 'rm -f "$GENERATED" "$GENLOG"' EXIT

# The generator is noisy (87 warnings on a healthy tree), so its output is held
# back rather than piped into the log. Discarding it outright would turn a
# generator failure into an unexplained diff, so keep it and print it on error.
if ! uv run manage.py spectacular --file "$GENERATED" >/dev/null 2>"$GENLOG"; then
    echo "manage.py spectacular failed:" >&2
    cat "$GENLOG" >&2
    exit 1
fi

if ! diff -u ../web/schema/pft.yaml "$GENERATED" > /tmp/schema.diff 2>&1; then
    echo "web/schema/pft.yaml is out of date with the backend." >&2
    echo "Regenerate it and re-run orval:" >&2
    echo "  cd api && uv run manage.py spectacular --file ../web/schema/pft.yaml" >&2
    echo "  cd web && pnpm orval" >&2
    echo >&2
    head -40 /tmp/schema.diff >&2
    exit 1
fi
echo "Schema in sync."
