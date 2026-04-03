# GraphQL Code Generator

This project uses [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) to generate TypeScript types directly from the AppSync GraphQL schema, keeping the app's types in sync with the backend.

## Prerequisites

You need an AppSync API key. Find it in the [AWS AppSync console](https://console.aws.amazon.com/appsync/) under your API → **Settings → API keys**.

## Setup

1. Copy `.env.example` to `.env` (if you haven't already):

   ```bash
   cp .env.example .env
   ```

2. Set `APPSYNC_API_KEY` and `APPSYNC_ENDPOINT` in your `.env`:

   ```
   APPSYNC_API_KEY=your_appsync_api_key
   APPSYNC_ENDPOINT=https://<your-api-id>.appsync-api.<region>.amazonaws.com/graphql
   ```

## Running codegen

```bash
yarn codegen
# or: npx graphql-codegen --config codegen.yml
```

This reads `APPSYNC_API_KEY` from your environment (`.env` is loaded automatically by the codegen CLI) and introspects the AppSync endpoint.

## Generated files

| File | Description |
|------|-------------|
| `src/generated/schema.ts` | TypeScript types for all GraphQL types, inputs, enums, and scalars |
| `graphql.schema.json` | Full schema introspection JSON (useful for IDE tooling) |

Both files are listed in `.gitignore` because they are derived from the remote schema and should be regenerated rather than committed.

## Importing generated types

Because `tsconfig.json` maps `@/*` → `./src/*`, you can import types as:

```typescript
import type { MyType } from '@/generated/schema'
```

## CI caveats

- `APPSYNC_API_KEY` must be available as a CI secret for the codegen step to succeed.
- Re-run `yarn codegen` after any schema change on the AppSync backend.
- The generated files are not committed; add a CI step to regenerate them if you need types available during the build.

## Configuration

The codegen configuration lives in [`codegen.yml`](../codegen.yml) at the repo root. It mirrors the setup used in the companion Next.js app (`corsa-next`).
