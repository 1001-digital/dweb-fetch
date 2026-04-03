# @1001-digital/dweb-fetch

## 0.2.1

### Patch Changes

- [`c04dff2`](https://github.com/1001-digital/dweb-fetch/commit/c04dff2ea3940ca83bc0c3e3fef682681d0b5045) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Fix EIP-155 `resolveUrl` to fetch token metadata JSON and extract the image URI (`image` or `image_url`) instead of resolving the raw `tokenURI` directly. Data URIs are returned as-is.

## 0.2.0

### Minor Changes

- [`380103a`](https://github.com/1001-digital/dweb-fetch/commit/380103ac94f587285723cd3695e5e7f49d624c58) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add optional EIP-155 protocol support for resolving NFT token URIs (ERC-721 and ERC-1155) via JSON-RPC. Enable by passing `eip155: { rpcUrls: { 1: '...' } }` to `createDwebFetch`. The handler resolves `eip155:<chainId>/<standard>:<contract>/<tokenId>` URIs by calling `tokenURI`/`uri` on the contract and delegating the resulting URI to the appropriate existing handler.

## 0.1.7

### Patch Changes

- [`8253afe`](https://github.com/1001-digital/dweb-fetch/commit/8253afe3b276b77f932977c8953e3e3880e8662c) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add gateway fallback for IPFS fetches
