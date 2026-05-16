---
'@1001-digital/dweb-fetch': patch
---

Fix IPFS handler to fall back to HTTP gateway when `@helia/verified-fetch` returns a non-OK response (e.g. 502, 504, 429), not just when it throws. Previously, a non-OK `Response` from verified-fetch would short-circuit the fallback path and be returned directly to the caller — propagating upstream gateway failures even when other configured gateways would have succeeded. If the gateway fallback also fails, verified-fetch's original non-OK response is returned rather than throwing, so callers retain visibility into the upstream status.
