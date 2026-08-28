#!/usr/bin/env bash
# Vercel Ignored Build Step for the landing site (wired up in vercel.json).
#
# Exit code contract, per https://vercel.com/docs/projects/overview#ignored-build-step:
#   exit 1 -> proceed with the build
#   exit 0 -> skip the deployment
#
# The site deploys only when the project version moves — the release-PR merge
# that RELEASING.md step 6 describes — not on every merge to main. Deploying on
# every push is what exhausted the free tier's build quota (the "Deployment
# rate limited" failures of 2026-08-13) and it redeploys marketing copy for
# changes that cannot affect it.
#
# The version is read from packages/sdk-ts/package.json. RELEASING.md moves it
# in lockstep with apps/api/pyproject.toml and packages/sdk-py/pyproject.toml,
# and it is the one of the three that is JSON, so no TOML parsing here.
set -u

MANIFEST="packages/sdk-ts/package.json"

# Paths after "<rev>:" are repo-root relative, so this works from apps/landing
# (Vercel runs the ignore command from the project's Root Directory).
version_at() {
  git show "$1:$MANIFEST" 2>/dev/null | node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => {
      try {
        process.stdout.write(JSON.parse(d).version || "");
      } catch {
        /* unreadable manifest -> empty, handled below */
      }
    });
  '
}

# Prefer the last successfully deployed commit (Vercel exposes it to the
# ignore step); a version bump then deploys even if it landed a few commits
# before this push. Fall back to the first parent when that commit is not in
# the shallow clone — for a merge to main, HEAD^ is the previous main, so the
# whole merged PR is still covered.
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  base="HEAD^"
fi

current="$(version_at HEAD)"
previous="$(version_at "$base")"

if [ -z "$current" ] || [ -z "$previous" ]; then
  echo "Could not read $MANIFEST at HEAD and $base — building to be safe."
  exit 1
fi

if [ "$current" != "$previous" ]; then
  echo "Project version bumped ($previous -> $current) — deploying."
  exit 1
fi

echo "Project version unchanged ($current since $base) — skipping deploy."
exit 0
