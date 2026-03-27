---
'@1001-digital/dweb-fetch': minor
---

Add optional EIP-155 protocol support for resolving NFT token URIs (ERC-721 and ERC-1155) via JSON-RPC. Enable by passing `eip155: { rpcUrls: { 1: '...' } }` to `createDwebFetch`. The handler resolves `eip155:<chainId>/<standard>:<contract>/<tokenId>` URIs by calling `tokenURI`/`uri` on the contract and delegating the resulting URI to the appropriate existing handler.
