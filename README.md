# StyleAgent Frontend

Thin-client React frontend for StyleAgent (MVP).

## Phase 0 Delivered

- Vite + React + TypeScript scaffold
- ESLint configured
- Frontend CI workflow (lint + build)
- API base URL via environment variable
- Health check integration through centralized API client

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

- `VITE_API_BASE_URL` (default used in code: `http://localhost:8000`)

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
