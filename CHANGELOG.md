# @1001-digital/dweb-fetch

## 0.6.0

### Minor Changes

- [`6b09625`](https://github.com/1001-digital/dweb-fetch/commit/6b09625226b6aa7dd59668b743d3d71400fde294) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add `ipfs.mode: 'gateway'` to fetch IPFS/IPNS content via direct HTTPS to configured gateways without loading `@helia/verified-fetch`.

  The default mode (`'verified'`) is unchanged: `@helia/verified-fetch` is used as the primary backend, with a direct HTTPS gateway fallback. In `'verified'` mode the Helia node carries libp2p, the blockstore, content routing, and peer state — which is fine for occasional use but accumulates measurable RSS and CPU under sustained high-volume workloads (e.g. NFT indexers caching thousands of token images).

  `'gateway'` mode skips Helia entirely. The `@helia/verified-fetch` module is never imported, so none of its initialization runs. Requests iterate `gateways` in order, returning the first 2xx response and wrapping the last failure in `DwebFetchError` if all gateways fail. Use this when you trust your gateways and want a lean, stateless IPFS client.

  ```ts
  createDwebFetch({
    ipfs: {
      mode: "gateway",
      gateways: ["https://ipfs.io", "https://dweb.link"],
    },
  });
  ```

## 0.5.1

### Patch Changes

- [`fed83c0`](https://github.com/1001-digital/dweb-fetch/commit/fed83c08cb017c10c2eabca9b512b04d8ab4accd) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Fix IPFS handler to fall back to HTTP gateway when `@helia/verified-fetch` returns a non-OK response (e.g. 502, 504, 429), not just when it throws. Previously, a non-OK `Response` from verified-fetch would short-circuit the fallback path and be returned directly to the caller — propagating upstream gateway failures even when other configured gateways would have succeeded. If the gateway fallback also fails, verified-fetch's original non-OK response is returned rather than throwing, so callers retain visibility into the upstream status.

## 0.5.0

### Minor Changes

- [`2819821`](https://github.com/1001-digital/dweb-fetch/commit/2819821101566615dc43911482191c00f9a2b254) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Delegate URL normalization to `@1001-digital/normalize-dweb-url`. Incoming URLs now get a richer normalization pass: path-style and subdomain-style IPFS/IPNS gateway URLs (`https://ipfs.io/ipfs/...`, `https://<cid>.ipfs.dweb.link/...`) and Arweave gateway URLs are rewritten to canonical `ipfs://` / `ipns://` / `ar://` form before routing. The local `normalizeIpfsUrl` export is removed; use `normalizeUri` (re-exported) instead.

### Patch Changes

- [`ebf6217`](https://github.com/1001-digital/dweb-fetch/commit/ebf62171fad6d2c0208d04c5a1c4b22e2c84574a) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Use a unique JSON-RPC `id` per `eth_call` in the EIP-155 handler instead of a hardcoded `id: 1`. Hardens against any upstream layer that may pair JSON-RPC responses by id under concurrent load.

## 0.4.0

### Minor Changes

- [#5](https://github.com/1001-digital/dweb-fetch/pull/5) [`1313e1b`](https://github.com/1001-digital/dweb-fetch/commit/1313e1b0e11b9dec518bbdf0ef20306155d0a5a2) Thanks [@yougogirldoteth](https://github.com/yougogirldoteth)! - Add `resolveEip155TokenUri()` for resolving ERC-721 and ERC-1155 token metadata
  URIs without fetching the metadata body.

## 0.3.0

### Minor Changes

- [`5f9f195`](https://github.com/1001-digital/dweb-fetch/commit/5f9f195d673e37720275e37e3d4df598b7810b80) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add `destroy()` method to `DwebClient` for graceful cleanup of protocol handlers. The IPFS handler now properly stops the underlying Helia node on destroy instead of just dropping the reference.

## 0.2.1

### Patch Changes

- [`c04dff2`](https://github.com/1001-digital/dweb-fetch/commit/c04dff2ea3940ca83bc0c3e3fef682681d0b5045) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Fix EIP-155 `resolveUrl` to fetch token metadata JSON and extract the image URI (`image` or `image_url`) instead of resolving the raw `tokenURI` directly. Data URIs are returned as-is.

## 0.2.0

### Minor Changes

- [`380103a`](https://github.com/1001-digital/dweb-fetch/commit/380103ac94f587285723cd3695e5e7f49d624c58) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add optional EIP-155 protocol support for resolving NFT token URIs (ERC-721 and ERC-1155) via JSON-RPC. Enable by passing `eip155: { rpcUrls: { 1: '...' } }` to `createDwebFetch`. The handler resolves `eip155:<chainId>/<standard>:<contract>/<tokenId>` URIs by calling `tokenURI`/`uri` on the contract and delegating the resulting URI to the appropriate existing handler.

## 0.1.7

### Patch Changes

- [`8253afe`](https://github.com/1001-digital/dweb-fetch/commit/8253afe3b276b77f932977c8953e3e3880e8662c) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add gateway fallback for IPFS fetches
