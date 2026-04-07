---
'@1001-digital/dweb-fetch': minor
---

Add `destroy()` method to `DwebClient` for graceful cleanup of protocol handlers. The IPFS handler now properly stops the underlying Helia node on destroy instead of just dropping the reference.
