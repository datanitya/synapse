---
name: sync-trends
description: Trigger a HackerNews trend sync and report what was ingested
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

Trigger a HackerNews trend sync and report the results.

## Steps

1. Check the API is running:
```bash
curl -s http://localhost:3001/api/health
```
If it returns anything other than `{"status":"ok"...}`, tell the user the API is not running and stop.

2. Trigger the sync endpoint (requires a valid JWT — prompt user if needed):
```bash
curl -s -X POST http://localhost:3001/api/trends/sync \
  -H "Authorization: Bearer $SYNAPSE_JWT" \
  -H "Content-Type: application/json"
```

3. Query the database for the most recently ingested trends:
```bash
cd apps/api && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.trend.findMany({
  orderBy: { fetchedAt: 'desc' },
  take: 10,
  select: { title: true, categories: true, score: true, publishedAt: true }
}).then(rows => { console.log(JSON.stringify(rows, null, 2)); return p.\$disconnect(); });
"
```

4. Report:
- How many trends were returned
- The top 5 by score with their categories
- Any sync errors if the endpoint returned non-200

If `SYNAPSE_JWT` is not set in the environment, tell the user to log in at http://localhost:3000, copy the `synapse_token` cookie value, and set it: `export SYNAPSE_JWT=<value>`.