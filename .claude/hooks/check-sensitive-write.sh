#!/usr/bin/env bash
# PreToolUse hook — Write / Edit
# Blocks writes to secret files (.env, migrations).

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path', d.get('path','')))" 2>/dev/null || echo "")

SENSITIVE_PATTERNS=(
  "\.env$"
  "\.env\.local$"
  "\.env\.production$"
  "\.env\.staging$"
  "apps/api/prisma/migrations/"
)

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -qE "$pattern"; then
    echo "{\"decision\":\"block\",\"reason\":\"Writing to $FILE_PATH is blocked. This file is listed in .clauderisks. Update .env.example with the new variable and instruct the user to update their local .env file manually.\"}"
    exit 2
  fi
done

exit 0