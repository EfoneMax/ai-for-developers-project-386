#!/usr/bin/env bash
set -euo pipefail

if ! git diff --quiet -- api/openapi web/src/client; then
  echo "Generated files are out of date. Run: mise run generate" >&2
  git diff --stat -- api/openapi web/src/client >&2
  exit 1
fi

untracked="$(git ls-files --others --exclude-standard -- api/openapi web/src/client)"
if [[ -n "$untracked" ]]; then
  echo "Generated files are untracked. Run: mise run generate" >&2
  printf '%s\n' "$untracked" >&2
  exit 1
fi
