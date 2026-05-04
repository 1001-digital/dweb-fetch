---
'@1001-digital/dweb-fetch': patch
---

Use a unique JSON-RPC `id` per `eth_call` in the EIP-155 handler instead of a hardcoded `id: 1`. Hardens against any upstream layer that may pair JSON-RPC responses by id under concurrent load.
