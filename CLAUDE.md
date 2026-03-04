# AGENTS.md

Decentralized web fetch library (`@1001-digital/dweb-fetch`) — fetch content from IPFS, IPNS, Arweave, and HTTPS.

## Code style

- TypeScript
- Single quotes, no semicolons

## Structure

- `src/` — Source code
- `src/index.ts` — Factory (`createDwebFetch`) + barrel exports
- `src/types.ts` — Public types
- `src/errors.ts` — Error classes
- `src/utils/parse-url.ts` — URL scheme extraction
- `src/protocols/` — Protocol handlers (ipfs, arweave, https)
- `test/` — Vitest tests (mirrors src structure)

## Key patterns

- Vite build step — outputs JS + `.d.ts` to `dist/`, source TS published alongside for editor navigation
- Lazy backend init — `createDwebFetch()` is synchronous; backends initialize on first `fetch()` call
- Dynamic imports — `@helia/verified-fetch` and `@ar.io/wayfinder-core` imported at runtime for tree-shaking
- Cached promise pattern for concurrent-safe lazy init

## Testing

```sh
pnpm test        # run once
pnpm test:watch  # watch mode
```

Tests mock all external dependencies (`@helia/verified-fetch`, `@ar.io/wayfinder-core`, `globalThis.fetch`).
