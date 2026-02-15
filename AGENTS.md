# StyleAgent Frontend – Agent Instructions

This repository contains the React frontend for StyleAgent.

## Scope (MVP)

- Target: Capture One only
- No authentication
- Thin client: all business logic lives in backend
- Frontend only orchestrates API calls

## Architectural Rules

1. Do NOT duplicate business logic from backend.
2. Use typed API responses (TypeScript interfaces).
3. All API calls must go through a centralized client layer.
4. No direct fetch calls inside components.
5. Keep UI simple and production-ready.
6. All changes must be delivered via Pull Request.

## Tech Stack (MVP)

- Vite
- React
- TypeScript
- Fetch API
- Minimal state (React state only)

## Non-Goals (MVP)

- No auth
- No styling framework (keep simple CSS)
- No global state library
- No server-side rendering

## Definition of Done

- CI passes
- Build succeeds
- Backend integration works
- No console errors
- Types are strict
