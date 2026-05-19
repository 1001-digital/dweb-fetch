---
'@1001-digital/dweb-fetch': minor
---

Add `ipfs.mode: 'gateway'` to fetch IPFS/IPNS content via direct HTTPS to configured gateways without loading `@helia/verified-fetch`.

The default mode (`'verified'`) is unchanged: `@helia/verified-fetch` is used as the primary backend, with a direct HTTPS gateway fallback. In `'verified'` mode the Helia node carries libp2p, the blockstore, content routing, and peer state — which is fine for occasional use but accumulates measurable RSS and CPU under sustained high-volume workloads (e.g. NFT indexers caching thousands of token images).

`'gateway'` mode skips Helia entirely. The `@helia/verified-fetch` module is never imported, so none of its initialization runs. Requests iterate `gateways` in order, returning the first 2xx response and wrapping the last failure in `DwebFetchError` if all gateways fail. Use this when you trust your gateways and want a lean, stateless IPFS client.

```ts
createDwebFetch({
  ipfs: {
    mode: 'gateway',
    gateways: ['https://ipfs.io', 'https://dweb.link'],
  },
})
```
