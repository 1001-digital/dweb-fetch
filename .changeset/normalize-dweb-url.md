---
'@1001-digital/dweb-fetch': minor
---

Delegate URL normalization to `@1001-digital/normalize-dweb-url`. Incoming URLs now get a richer normalization pass: path-style and subdomain-style IPFS/IPNS gateway URLs (`https://ipfs.io/ipfs/...`, `https://<cid>.ipfs.dweb.link/...`) and Arweave gateway URLs are rewritten to canonical `ipfs://` / `ipns://` / `ar://` form before routing. The local `normalizeIpfsUrl` export is removed; use `normalizeUri` (re-exported) instead.
