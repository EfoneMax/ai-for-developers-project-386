#!/usr/bin/env bash
set -euo pipefail

default_branch="${DEFAULT_BRANCH:-main}"
base="$(git merge-base "origin/${default_branch}" HEAD 2>/dev/null || true)"

if [[ -n "$base" && "$base" != "$(git rev-parse HEAD)" ]]; then
  npx --no-install commitlint --from "$base" --to HEAD
else
  npx --no-install commitlint --last
fi
