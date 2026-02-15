# StyleAgent Frontend

Thin-client React frontend for StyleAgent (MVP).

## Current Status

- Phase 0 complete: scaffold + CI + health integration
- Phase 1 complete: core flow UI
  - Create Style
  - Create Version
  - Compile (Capture One)
  - Download Artifact

## Setup

```bash
npm install
```

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Variable:

- `VITE_API_BASE_URL` (default in code: `http://localhost:8000`)

## Run

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

## Notes

- All API calls are centralized in `src/api/client.ts`.
- No direct `fetch` calls are used inside components.
