# @1001-digital/dweb-fetch

Fetch library for decentralized web protocols (IPFS, IPNS, Arweave, EIP-155 NFT references) with native protocol clients and verified content retrieval.

## Usage

```ts
import { createDwebFetch } from '@1001-digital/dweb-fetch'

const dwebFetch = createDwebFetch()

// IPFS
const ipfsResponse = await dwebFetch('ipfs://bafyABC...')

// IPNS
const ipnsResponse = await dwebFetch('ipns://example.eth')

// Arweave
const arResponse = await dwebFetch('ar://txId123')

// HTTPS passthrough
const httpsResponse = await dwebFetch('https://example.com/data.json')

// EIP-155 NFT reference (requires config, see below)
const nftMetadata = await dwebFetch('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234')
```

## Configuration

```ts
const dwebFetch = createDwebFetch({
  ipfs: {
    gateways: ['https://my-gateway.io'],
    routers: ['https://my-router.io'],
  },
  arweave: {
    // Custom static gateways (tried first by default)
    gateways: ['https://arweave.net', 'https://ar-io.dev'],
    // Routing strategy for network discovery fallback: 'random' | 'fastest' | 'balanced' | 'preferred'
    routingStrategy: 'fastest',
    // Disable network discovery fallback entirely
    useNetworkDiscovery: false,
  },
  eip155: {
    // JSON-RPC endpoints per chain ID
    rpcUrls: {
      1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
      137: 'https://polygon-rpc.com',
    },
  },
})
```

## Protocol Backends

- **IPFS/IPNS** — `@helia/verified-fetch` for content-verified retrieval
- **Arweave** — Static gateways first, falls back to `@ar.io/wayfinder-core` network discovery
- **HTTP/HTTPS** — Native `fetch` passthrough
- **EIP-155** — Resolves NFT token URIs via JSON-RPC (`tokenURI` for ERC-721, `uri` for ERC-1155), then fetches the result through the appropriate handler above. Opt-in — only active when `eip155` config is provided.

All backends are lazily initialized on first use.

## API

### `createDwebFetch(config?): DwebFetch`

Creates a fetch function that routes URLs to the appropriate protocol handler. Synchronous — backends initialize lazily on first fetch.

### `extractScheme(url): string | undefined`

Extracts the URL scheme (e.g., `'ipfs'`, `'ar'`, `'https'`).

### `parseDwebUrl(url): ParsedDwebUrl | undefined`

Parses a URL into scheme, raw URL, and path components.

### `parseEip155Uri(url): ParsedEip155Uri | undefined`

Parses an EIP-155 URI (`eip155:<chainId>/<standard>:<contract>/<tokenId>`) into its components.

### Error Classes

- `DwebFetchError` — Base error for all fetch failures
- `DwebUnsupportedProtocolError` — Thrown for unknown URL schemes
- `Eip155ResolutionError` — Thrown when EIP-155 resolution fails (missing RPC config, empty tokenURI, etc.)
