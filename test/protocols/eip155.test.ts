import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEip155Handler } from '../../src/protocols/eip155'
import { DwebFetchError, Eip155ResolutionError } from '../../src/errors'
import type { DwebClient } from '../../src/types'
import { abiEncodeString } from '../helpers/abi-encode'

describe('createEip155Handler', () => {
  const mockGlobalFetch = vi.fn()
  const mockClient: DwebClient = {
    fetch: vi.fn(),
    resolveUrl: vi.fn(),
  }

  const config = {
    rpcUrls: { 1: 'https://eth-rpc.example.com' },
  }

  beforeEach(() => {
    mockGlobalFetch.mockReset()
    vi.mocked(mockClient.fetch).mockReset()
    vi.mocked(mockClient.resolveUrl).mockReset()
    vi.stubGlobal('fetch', mockGlobalFetch)
  })

  describe('fetch', () => {
    it('resolves ERC-721 tokenURI and delegates to parent client', async () => {
      const tokenUri = 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(
        new Response('{"name":"Test NFT"}'),
      )

      const handler = createEip155Handler(config, () => mockClient)
      const response = await handler.fetch(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234',
      )

      expect(await response.text()).toBe('{"name":"Test NFT"}')
      expect(mockClient.fetch).toHaveBeenCalledWith(tokenUri, undefined)

      // Verify the RPC call
      const rpcCall = JSON.parse(mockGlobalFetch.mock.calls[0][1].body)
      expect(rpcCall.method).toBe('eth_call')
      expect(rpcCall.params[0].to).toBe('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D')
      expect(rpcCall.params[0].data).toMatch(/^0xc87b56dd/) // tokenURI selector
    })

    it('resolves ERC-1155 uri and delegates to parent client', async () => {
      const tokenUri = 'https://api.example.com/token/{id}.json'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(
        new Response('{"name":"Test Token"}'),
      )

      const handler = createEip155Handler(config, () => mockClient)
      await handler.fetch(
        'eip155:1/erc1155:0x2953399124F0cBB46d2CbACD8A89cF0599974963/5',
      )

      // Verify the RPC call uses uri() selector
      const rpcCall = JSON.parse(mockGlobalFetch.mock.calls[0][1].body)
      expect(rpcCall.params[0].data).toMatch(/^0x0e89341c/) // uri selector

      // Verify {id} substitution
      const expectedUri = 'https://api.example.com/token/0000000000000000000000000000000000000000000000000000000000000005.json'
      expect(mockClient.fetch).toHaveBeenCalledWith(expectedUri, undefined)
    })

    it('handles tokenURI returning https:// URL', async () => {
      const tokenUri = 'https://api.example.com/metadata/1'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(
        new Response('{"name":"Test"}'),
      )

      const handler = createEip155Handler(config, () => mockClient)
      await handler.fetch(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
      )

      expect(mockClient.fetch).toHaveBeenCalledWith(tokenUri, undefined)
    })

    it('throws Eip155ResolutionError when no RPC URL configured for chain', async () => {
      const handler = createEip155Handler(config, () => mockClient)

      await expect(
        handler.fetch('eip155:137/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(Eip155ResolutionError)

      await expect(
        handler.fetch('eip155:137/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow('No RPC URL configured for chain 137')
    })

    it('throws DwebFetchError for invalid URI', async () => {
      const handler = createEip155Handler(config, () => mockClient)

      await expect(handler.fetch('eip155:bad')).rejects.toThrow(DwebFetchError)
      await expect(handler.fetch('eip155:bad')).rejects.toThrow('Invalid EIP-155 URI')
    })

    it('throws Eip155ResolutionError for empty tokenURI result', async () => {
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x' }),
          { status: 200 },
        ),
      )

      const handler = createEip155Handler(config, () => mockClient)

      await expect(
        handler.fetch('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(Eip155ResolutionError)
    })

    it('wraps RPC JSON errors in DwebFetchError', async () => {
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            error: { message: 'execution reverted' },
          }),
          { status: 200 },
        ),
      )

      const handler = createEip155Handler(config, () => mockClient)

      await expect(
        handler.fetch('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(DwebFetchError)
    })

    it('wraps RPC HTTP errors in DwebFetchError', async () => {
      mockGlobalFetch.mockResolvedValue(
        new Response('Internal Server Error', { status: 500 }),
      )

      const handler = createEip155Handler(config, () => mockClient)

      await expect(
        handler.fetch('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(DwebFetchError)
    })

    it('wraps network errors in DwebFetchError', async () => {
      mockGlobalFetch.mockRejectedValue(new TypeError('fetch failed'))

      const handler = createEip155Handler(config, () => mockClient)

      const error = await handler.fetch(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
      ).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(DwebFetchError)
      expect((error as DwebFetchError).cause).toBeInstanceOf(TypeError)
    })

    it('throws Eip155ResolutionError for null RPC result', async () => {
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }),
          { status: 200 },
        ),
      )

      const handler = createEip155Handler(config, () => mockClient)

      await expect(
        handler.fetch('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(Eip155ResolutionError)
    })

    it('does not substitute {id} for ERC-1155 URIs without placeholder', async () => {
      const tokenUri = 'https://api.example.com/token/5.json'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(new Response('ok'))

      const handler = createEip155Handler(config, () => mockClient)
      await handler.fetch(
        'eip155:1/erc1155:0x2953399124F0cBB46d2CbACD8A89cF0599974963/5',
      )

      expect(mockClient.fetch).toHaveBeenCalledWith(tokenUri, undefined)
    })

    it('forwards options to parent client fetch', async () => {
      const tokenUri = 'https://example.com/meta'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(new Response('ok'))

      const options = {
        signal: new AbortController().signal,
        headers: { 'Accept': 'application/json' },
      }
      const handler = createEip155Handler(config, () => mockClient)
      await handler.fetch(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
        options,
      )

      expect(mockClient.fetch).toHaveBeenCalledWith(tokenUri, options)
    })

    it('passes signal through to RPC call', async () => {
      const tokenUri = 'https://example.com/meta'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(new Response('ok'))

      const controller = new AbortController()
      const handler = createEip155Handler(config, () => mockClient)
      await handler.fetch(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
        { signal: controller.signal },
      )

      expect(mockGlobalFetch.mock.calls[0][1].signal).toBe(controller.signal)
    })
  })

  describe('resolveUrl', () => {
    it('fetches metadata and resolves the image URL', async () => {
      const tokenUri = 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
      const imageUri = 'ipfs://QmImageHash'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: 'Test', image: imageUri })),
      )
      vi.mocked(mockClient.resolveUrl).mockResolvedValue(
        'https://ipfs.io/ipfs/QmImageHash',
      )

      const handler = createEip155Handler(config, () => mockClient)
      const result = await handler.resolveUrl(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234',
      )

      expect(result).toBe('https://ipfs.io/ipfs/QmImageHash')
      expect(mockClient.fetch).toHaveBeenCalledWith(tokenUri)
      expect(mockClient.resolveUrl).toHaveBeenCalledWith(imageUri)
    })

    it('falls back to image_url field', async () => {
      const tokenUri = 'https://api.example.com/meta/1'
      const imageUrl = 'https://img.example.com/1.png'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: 'Test', image_url: imageUrl })),
      )
      vi.mocked(mockClient.resolveUrl).mockResolvedValue(imageUrl)

      const handler = createEip155Handler(config, () => mockClient)
      const result = await handler.resolveUrl(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
      )

      expect(result).toBe(imageUrl)
      expect(mockClient.resolveUrl).toHaveBeenCalledWith(imageUrl)
    })

    it('returns data URIs directly without further resolution', async () => {
      const tokenUri = 'https://api.example.com/meta/1'
      const dataUri = 'data:image/svg+xml,<svg></svg>'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: 'Test', image: dataUri })),
      )

      const handler = createEip155Handler(config, () => mockClient)
      const result = await handler.resolveUrl(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
      )

      expect(result).toBe(dataUri)
      expect(mockClient.resolveUrl).not.toHaveBeenCalled()
    })

    it('throws Eip155ResolutionError when metadata has no image', async () => {
      const tokenUri = 'https://api.example.com/meta/1'
      mockGlobalFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: abiEncodeString(tokenUri) }),
          { status: 200 },
        ),
      )
      vi.mocked(mockClient.fetch).mockResolvedValue(
        new Response(JSON.stringify({ name: 'Test' })),
      )

      const handler = createEip155Handler(config, () => mockClient)

      await expect(
        handler.resolveUrl('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(Eip155ResolutionError)
    })

    it('throws Eip155ResolutionError when no RPC URL configured', async () => {
      const handler = createEip155Handler(config, () => mockClient)

      await expect(
        handler.resolveUrl('eip155:42161/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1'),
      ).rejects.toThrow(Eip155ResolutionError)
    })

    it('wraps network errors in DwebFetchError', async () => {
      mockGlobalFetch.mockRejectedValue(new TypeError('fetch failed'))

      const handler = createEip155Handler(config, () => mockClient)

      const error = await handler.resolveUrl(
        'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
      ).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(DwebFetchError)
      expect((error as DwebFetchError).cause).toBeInstanceOf(TypeError)
    })
  })
})
