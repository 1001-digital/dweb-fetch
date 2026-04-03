import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDwebFetch, DwebFetchError, DwebUnsupportedProtocolError } from '../src/index'
import { abiEncodeString } from './helpers/abi-encode'

const mockVerifiedFetch = vi.fn()
vi.mock('@helia/verified-fetch', () => ({
  createVerifiedFetch: vi.fn().mockResolvedValue(
    (...args: unknown[]) => mockVerifiedFetch(...args),
  ),
}))

const mockWayfinderRequest = vi.fn()
const mockWayfinderResolveUrl = vi.fn()
vi.mock('@ar.io/wayfinder-core', () => ({
  createWayfinderClient: vi.fn().mockReturnValue({
    request: (...args: unknown[]) => mockWayfinderRequest(...args),
    resolveUrl: (...args: unknown[]) => mockWayfinderResolveUrl(...args),
  }),
}))

describe('createDwebFetch', () => {
  const mockGlobalFetch = vi.fn()

  beforeEach(() => {
    mockVerifiedFetch.mockReset()
    mockWayfinderRequest.mockReset()
    mockWayfinderResolveUrl.mockReset()
    mockGlobalFetch.mockReset()
    vi.stubGlobal('fetch', mockGlobalFetch)
  })

  it('returns an object with fetch and resolveUrl', () => {
    const dweb = createDwebFetch()
    expect(typeof dweb.fetch).toBe('function')
    expect(typeof dweb.resolveUrl).toBe('function')
  })

  describe('fetch', () => {
    it('routes ipfs:// to IPFS handler', async () => {
      mockVerifiedFetch.mockResolvedValue(new Response('ipfs data'))

      const dweb = createDwebFetch()
      const response = await dweb.fetch('ipfs://bafyABC')

      expect(await response.text()).toBe('ipfs data')
    })

    it('routes ipns:// to IPFS handler', async () => {
      mockVerifiedFetch.mockResolvedValue(new Response('ipns data'))

      const dweb = createDwebFetch()
      const response = await dweb.fetch('ipns://example.eth')

      expect(await response.text()).toBe('ipns data')
    })

    it('routes ar:// to Arweave handler', async () => {
      mockGlobalFetch.mockResolvedValue(new Response('arweave data', { status: 200 }))

      const dweb = createDwebFetch()
      const response = await dweb.fetch('ar://txId123')

      expect(await response.text()).toBe('arweave data')
    })

    it('routes https:// to HTTPS handler', async () => {
      mockGlobalFetch.mockResolvedValue(new Response('https data'))

      const dweb = createDwebFetch()
      const response = await dweb.fetch('https://example.com')

      expect(await response.text()).toBe('https data')
    })

    it('routes http:// to HTTPS handler', async () => {
      mockGlobalFetch.mockResolvedValue(new Response('http data'))

      const dweb = createDwebFetch()
      const response = await dweb.fetch('http://example.com')

      expect(await response.text()).toBe('http data')
    })

    it('routes raw IPFS hashes to IPFS handler', async () => {
      mockVerifiedFetch.mockResolvedValue(new Response('raw hash data'))

      const dweb = createDwebFetch()
      const response = await dweb.fetch(
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      )

      expect(await response.text()).toBe('raw hash data')
      expect(mockVerifiedFetch).toHaveBeenCalledWith(
        'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        expect.any(Object),
      )
    })

    it('fetches base64-encoded data: URIs', async () => {
      const dweb = createDwebFetch()
      const response = await dweb.fetch(
        'data:application/json;base64,eyJuYW1lIjoiVGVzdCBORlQifQ==',
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(await response.json()).toEqual({ name: 'Test NFT' })
    })

    it('fetches plain text data: URIs', async () => {
      const dweb = createDwebFetch()
      const response = await dweb.fetch('data:text/plain,Hello%20World')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/plain')
      expect(await response.text()).toBe('Hello World')
    })

    it('defaults to text/plain for data: URIs without media type', async () => {
      const dweb = createDwebFetch()
      const response = await dweb.fetch('data:,Hello')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe(
        'text/plain;charset=US-ASCII',
      )
      expect(await response.text()).toBe('Hello')
    })

    it('throws DwebFetchError for malformed data: URIs', async () => {
      const dweb = createDwebFetch()
      await expect(dweb.fetch('data:')).rejects.toThrow(DwebFetchError)
    })

    it('throws DwebUnsupportedProtocolError for unknown schemes', async () => {
      const dweb = createDwebFetch()

      await expect(dweb.fetch('ftp://example.com')).rejects.toThrow(
        DwebUnsupportedProtocolError,
      )
    })

    it('throws DwebUnsupportedProtocolError for schemeless URLs', async () => {
      const dweb = createDwebFetch()

      await expect(dweb.fetch('just-a-string')).rejects.toThrow(
        DwebUnsupportedProtocolError,
      )
    })

    it('includes the scheme in the error', async () => {
      const dweb = createDwebFetch()

      try {
        await dweb.fetch('ftp://example.com')
      } catch (error) {
        expect(error).toBeInstanceOf(DwebUnsupportedProtocolError)
        expect((error as DwebUnsupportedProtocolError).scheme).toBe('ftp')
      }
    })

    it('throws DwebUnsupportedProtocolError for eip155: without config', async () => {
      const dweb = createDwebFetch()

      await expect(
        dweb.fetch('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(DwebUnsupportedProtocolError)
    })

    it('routes eip155: to EIP-155 handler when configured', async () => {
      const tokenUri = 'https://api.example.com/token/1'

      // First call: RPC eth_call returns ABI-encoded tokenURI
      mockGlobalFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
            { status: 200 },
          ),
        )
        // Second call: fetching the tokenURI itself
        .mockResolvedValueOnce(
          new Response('{"name":"Test NFT","image":"ipfs://QmABC"}'),
        )

      const dweb = createDwebFetch({
        eip155: { rpcUrls: { 1: 'https://eth-rpc.example.com' } },
      })
      const response = await dweb.fetch(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
      )

      const json = await response.json()
      expect(json.name).toBe('Test NFT')
    })
  })

  describe('resolveUrl', () => {
    it('returns empty string for empty input', async () => {
      const dweb = createDwebFetch()
      expect(await dweb.resolveUrl('')).toBe('')
    })

    it('returns data: URIs as-is', async () => {
      const dweb = createDwebFetch()
      const dataUri = 'data:image/png;base64,abc123'
      expect(await dweb.resolveUrl(dataUri)).toBe(dataUri)
    })

    it('resolves ipfs:// to gateway URL', async () => {
      const dweb = createDwebFetch()
      const result = await dweb.resolveUrl('ipfs://bafyABC/image.png')
      expect(result).toBe('https://ipfs.io/ipfs/bafyABC/image.png')
    })

    it('resolves ipns:// to gateway URL', async () => {
      const dweb = createDwebFetch()
      const result = await dweb.resolveUrl('ipns://example.eth')
      expect(result).toBe('https://ipfs.io/ipns/example.eth')
    })

    it('resolves raw IPFS hashes to gateway URL', async () => {
      const dweb = createDwebFetch()
      const result = await dweb.resolveUrl(
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      )
      expect(result).toBe(
        'https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      )
    })

    it('resolves ar:// using static gateway', async () => {
      const dweb = createDwebFetch()
      const result = await dweb.resolveUrl('ar://txId123')

      expect(result).toBe('https://arweave.net/txId123')
    })

    it('returns https:// URLs as-is', async () => {
      const dweb = createDwebFetch()
      const result = await dweb.resolveUrl('https://example.com/image.png')
      expect(result).toBe('https://example.com/image.png')
    })

    it('uses custom IPFS gateway when configured', async () => {
      const dweb = createDwebFetch({
        ipfs: { gateways: ['https://my-gateway.io'] },
      })
      const result = await dweb.resolveUrl('ipfs://bafyABC')
      expect(result).toBe('https://my-gateway.io/ipfs/bafyABC')
    })

    it('throws for unsupported schemes', async () => {
      const dweb = createDwebFetch()
      await expect(dweb.resolveUrl('ftp://example.com')).rejects.toThrow(
        DwebUnsupportedProtocolError,
      )
    })

    it('throws DwebUnsupportedProtocolError for eip155: without config', async () => {
      const dweb = createDwebFetch()

      await expect(
        dweb.resolveUrl('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(DwebUnsupportedProtocolError)
    })

    it('resolves eip155: URIs when configured', async () => {
      const tokenUri = 'ipfs://QmMetadataHash'
      const imageUri = 'ipfs://QmImageHash'

      // RPC eth_call for tokenURI
      mockGlobalFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      // Metadata fetch via verified-fetch (IPFS handler)
      mockVerifiedFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ name: 'Test', image: imageUri }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const dweb = createDwebFetch({
        eip155: { rpcUrls: { 1: 'https://eth-rpc.example.com' } },
      })
      const result = await dweb.resolveUrl(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234',
      )

      expect(result).toBe('https://ipfs.io/ipfs/QmImageHash')
    })
  })
})
