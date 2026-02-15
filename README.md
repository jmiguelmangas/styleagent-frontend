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
- Frontend remains thin client; compile logic stays in backend.
