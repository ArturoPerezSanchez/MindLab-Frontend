# Web deployment handoff

The supplied multi-stage Dockerfile builds immutable Vite assets and serves
them with Nginx. Nginx applies security headers, cache policy, request-size
limits, SPA fallback, and REST/WebSocket proxying to a service named `backend`.
`compose.local.yml` is the executable local reference.

For a public deployment:

1. Build a tested image from an immutable Git commit. Keep API calls same-origin
   through `/api/v1` when possible; otherwise set `VITE_API_BASE_URL` at build
   time and configure the backend's exact CORS origin.
2. Put the service behind TLS with HTTP-to-HTTPS redirects. Preserve WebSocket
   upgrades and do not expose the backend container around the trusted proxy.
3. Replace the Compose development secret and environment with the backend
   production checklist. Keep the frontend and API release versions compatible
   with the checked OpenAPI contract.
4. If a third-party analytics/ad script is approved, update consent text and
   CSP for only its exact hosts. The default CSP intentionally blocks arbitrary
   scripts and frames.
5. Add domain-level smoke tests for every route and puzzle, synthetic readiness
   monitoring, CDN invalidation rules for `index.html`, rollback, and alerting.

Public launch also requires the legal/operator, data-retention, password
recovery, PostgreSQL/Redis, observability, backup/restore, ad/CMP, and external
security work listed in `MindLab-Backend/docs/production.md`.
