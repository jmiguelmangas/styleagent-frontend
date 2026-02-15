# StyleAgent Frontend

Thin-client React frontend for StyleAgent (MVP).

## Current Status

- Phase 0 complete: scaffold + CI + health integration
- Phase 1 complete: core flow UI
  - Create Style
  - Create Version
  - Compile (Capture One)
  - Download Artifact
- Phase 2 complete: UX improvements
  - Better error display
  - Loading states per action
  - Improved JSON editor UX for `StyleSpec`
  - Artifact history view
- Phase 3 complete: production hardening
  - Runtime API payload validation for core responses
  - Timeout handling and normalized client errors
  - Edge-case guards for user inputs and JSON payloads
  - Deployment-oriented Vite config (`base path`, host/ports, build target)
- Phase 4 complete: Docker support
  - Multi-stage Docker build
  - Static serving with Nginx
  - SPA fallback config

## Setup

```bash
npm install
```

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Optional production template:

```bash
cp .env.production.example .env.production
```

Variables:

- `VITE_API_BASE_URL` (default: `http://localhost:8000`)
- `VITE_API_TIMEOUT_MS` (default: `10000`)
- `VITE_APP_BASE_PATH` (default: `/`)

## Run (Local Dev)

```bash
npm run dev
```

## Lint

```bash
npm run lint
```

## Build

```bash
npm run build
```

## Run With Docker

Build image from `frontend/`:

```bash
docker build -t styleagent-frontend:dev \
  --build-arg VITE_API_BASE_URL=http://localhost:8000 \
  --build-arg VITE_API_TIMEOUT_MS=10000 \
  --build-arg VITE_APP_BASE_PATH=/ \
  .
```

Run container:

```bash
docker run --rm -p 5173:80 styleagent-frontend:dev
```

Frontend URL:
- `http://localhost:5173`

Container health (nginx lightweight check):
- `http://localhost:5173/health`

## Notes

- All API calls are centralized in `src/api/client.ts`.
- No direct `fetch` calls are used inside components.
- Frontend remains thin client; compile logic stays in backend.
