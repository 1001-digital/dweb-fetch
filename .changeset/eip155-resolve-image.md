---
'@1001-digital/dweb-fetch': patch
---

Fix EIP-155 `resolveUrl` to fetch token metadata JSON and extract the image URI (`image` or `image_url`) instead of resolving the raw `tokenURI` directly. Data URIs are returned as-is.
