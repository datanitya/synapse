#!/usr/bin/env bash
# PostToolUse hook — Write / Edit
# Runs tsc --noEmit when a TypeScript file is changed. Streams errors as a notification.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path', d.get('path','')))" 2>/dev/null || echo "")

# Only run for .ts / .tsx files
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

# Skip test/spec and generated files
if echo "$FILE_PATH" | grep -qE '\.(spec|test)\.(ts|tsx)$|node_modules|\.next|dist'; then
  exit 0
fi

# Determine which app was changed
if echo "$FILE_PATH" | grep -q 'apps/api/'; then
  APP_DIR="apps/api"
elif echo "$FILE_PATH" | grep -q 'apps/web/'; then
  APP_DIR="apps/web"
elif echo "$FILE_PATH" | grep -q 'packages/types/'; then
  # Types changed — check both apps
  cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" && \
    pnpm --filter @synapse/api exec tsc --noEmit 2>&1 | head -20 && \
    pnpm --filter @synapse/web exec tsc --noEmit 2>&1 | head -20
  exit 0
else
  exit 0
fi

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT/$APP_DIR" && npx tsc --noEmit 2>&1 | head -30

exit 0