#!/usr/bin/env bash
# PreToolUse hook — Bash
# Blocks destructive git and database commands. Reads tool input from stdin as JSON.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null || echo "")

# Block force push to main/master
if echo "$COMMAND" | grep -qE 'git push.*(--force|-f).*(main|master)'; then
  echo '{"decision":"block","reason":"Force-pushing to main/master is not allowed. Use a feature branch and open a PR instead."}'
  exit 2
fi

# Block prisma migrate reset (destroys all data)
if echo "$COMMAND" | grep -qE 'prisma migrate reset'; then
  echo '{"decision":"block","reason":"prisma migrate reset will destroy all data. Run prisma migrate dev for normal migrations, or confirm with the user before running reset."}'
  exit 2
fi

# Block docker compose down -v (destroys database volumes)
if echo "$COMMAND" | grep -qE 'docker compose down.*-v|docker-compose down.*-v'; then
  echo '{"decision":"block","reason":"docker compose down -v will delete PostgreSQL and Redis data volumes. Confirm with the user before proceeding."}'
  exit 2
fi

# Warn about git reset --hard (but allow it — user may have approved)
if echo "$COMMAND" | grep -qE 'git reset --hard'; then
  echo '{"decision":"block","reason":"git reset --hard discards uncommitted changes permanently. Confirm this is intentional before proceeding."}'
  exit 2
fi

exit 0