---
name: gen-post
description: Guided LinkedIn post generation — pick a trend, generate 3 variations, preview them
user-invocable: true
argument-hint: "[topic or trend ID]"
allowed-tools:
  - Bash
  - Read
---

Guide the user through generating a LinkedIn post using the SYNAPSE content engine.

## Steps

### 1. Check API health
```bash
curl -s http://localhost:3001/api/health
```
If not healthy, stop and tell the user to start the API: `pnpm --filter @synapse/api start:dev`

### 2. Fetch available trends (if no argument given)
If $ARGUMENTS is empty, fetch the current trend list and display the top 5 so the user can choose:
```bash
curl -s "http://localhost:3001/api/trends?limit=5" \
  -H "Authorization: Bearer $SYNAPSE_JWT" | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const t=JSON.parse(d); t.trends?.forEach((x,i)=>console.log(i+1+'. ['+x.id+'] '+x.title+' (score: '+x.score+')'))"
```

Ask: "Which trend number do you want to write about? Or paste a custom topic."

### 3. Generate post
Call the content generation endpoint with the chosen topic or trend ID:

```bash
curl -s -X POST http://localhost:3001/api/content/generate \
  -H "Authorization: Bearer $SYNAPSE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"topic": "$ARGUMENTS"}'
```

(Replace `trendId` if the user selected a numbered trend from the list.)

### 4. Display variations
Parse the response and display all 3 variations clearly:

```
--- Variation 1: Direct Insight ---
<content>

--- Variation 2: Story Hook ---
<content>

--- Variation 3: Provocative Question ---
<content>
```

Ask the user: "Which variation do you prefer? You can edit it further at /drafts/[id] in the app."

### 5. Next steps
Tell the user:
- The draft is saved at `http://localhost:3000/drafts/<id>`
- They can edit, change status to APPROVED, and copy it to post manually on LinkedIn
- No auto-posting will occur

If `SYNAPSE_JWT` is not set, tell the user to log in at http://localhost:3000 and export the cookie value.