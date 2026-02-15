# Low Level Design – StyleAgent Frontend

## Architecture Overview

Frontend is a thin client.

Backend is source of truth.

## Folder Structure

src/
  api/
    client.ts
    types.ts
  components/
  pages/
  hooks/
  router.tsx

## API Client

- Centralized fetch wrapper
- Handles:
  - base URL
  - JSON parsing
  - error normalization

## State Strategy

MVP:
- Local component state
- No Redux/Zustand

Future:
- Could introduce query layer (TanStack Query)

## Error Handling

- All API errors normalized:
  {
    message: string
    status: number
  }

UI must display:
- Network errors
- 4xx validation errors
- 5xx server errors

## Compile Flow

1. POST /styles
2. POST /styles/{id}/versions
3. POST /compile?target=captureone
4. GET artifact download

No compile logic in frontend.
