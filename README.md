# Stock News

Blank-slate site for viewing stock news and basic market charts. This repository is independent of the existing pAnalyst MVP application, while initially deploying inside the same Render workspace.

## Current state

- Static foundation only; no production data integrations are active.
- No user accounts, database, or server component yet.
- No secret values belong in this repository or in browser-side JavaScript.

## Architecture direction

The static page can remain the frontend, but live news, charts, and future member accounts require a server-side API and database:

1. Browser UI renders public pages and authenticated member views.
2. Server-side routes call market-data providers and keep provider keys private.
3. A database stores members, saved symbols, cached news, and preferences.
4. Render owns production environment variables; `.env` files remain local and uncommitted.

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.
