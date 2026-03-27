# @1001-digital/dweb-fetch

## 0.2.0

### Minor Changes

- [`380103a`](https://github.com/1001-digital/dweb-fetch/commit/380103ac94f587285723cd3695e5e7f49d624c58) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add optional EIP-155 protocol support for resolving NFT token URIs (ERC-721 and ERC-1155) via JSON-RPC. Enable by passing `eip155: { rpcUrls: { 1: '...' } }` to `createDwebFetch`. The handler resolves `eip155:<chainId>/<standard>:<contract>/<tokenId>` URIs by calling `tokenURI`/`uri` on the contract and delegating the resulting URI to the appropriate existing handler.

## 0.1.7

### Patch Changes

- [`8253afe`](https://github.com/1001-digital/dweb-fetch/commit/8253afe3b276b77f932977c8953e3e3880e8662c) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add gateway fallback for IPFS fetches
