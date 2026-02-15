# ADR-002: Thin Client

Status: Accepted

## Decision

All style compilation logic remains in backend.

Frontend only calls API endpoints.

## Rationale

- Single source of truth
- Easier future multi-target support
- Prevents logic duplication
