# Run the complete local product

Clone the repositories as sibling folders named `frontend` and `backend` (the
provided workspace already has this layout). Docker Desktop with Compose v2 is
the only runtime requirement.

```powershell
cd frontend
docker compose -f compose.local.yml up --build
```

Open <http://127.0.0.1:8080>. The backend is private to the Compose network,
the Nginx frontend proxies REST and WebSocket traffic under `/api/v1`, and the
SQLite user database persists in the `mindlab-data` volume. Stop without
deleting data:

```powershell
docker compose -f compose.local.yml down
```

Delete the local database only when deliberately resetting the environment:

```powershell
docker compose -f compose.local.yml down --volumes
```

For source development, start the backend on port 8010 as its README describes,
copy `.env.example` to `.env.local`, and run `npm ci` then `npm run dev`. Vite
proxies `/api/v1` to the configured backend and upgrades multiplayer sockets.

Before handing off a build, run:

```powershell
npm run lint
npm test -- --run
npm run build
npm audit --audit-level=high
docker build -t mindlab-frontend .
```
