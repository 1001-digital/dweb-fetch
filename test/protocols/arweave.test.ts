import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createArweaveHandler } from '../../src/protocols/arweave'
import { DwebFetchError } from '../../src/errors'

const mockWayfinderRequest = vi.fn()
const mockWayfinderResolveUrl = vi.fn()
const mockCreateWayfinderClient = vi.fn()
const mockCreateRoutingStrategy = vi.fn()

vi.mock('@ar.io/wayfinder-core', () => ({
  createWayfinderClient: (...args: unknown[]) => {
    mockCreateWayfinderClient(...args)
    return {
      request: mockWayfinderRequest,
      resolveUrl: mockWayfinderResolveUrl,
    }
  },
  createRoutingStrategy: (...args: unknown[]) => {
    mockCreateRoutingStrategy(...args)
    return 'mock-strategy'
  },
}))

describe('createArweaveHandler', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockWayfinderRequest.mockReset()
    mockWayfinderResolveUrl.mockReset()
    mockCreateWayfinderClient.mockReset()
    mockCreateRoutingStrategy.mockReset()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('fetch', () => {
    describe('with static gateways first (default)', () => {
      it('uses static gateways by default', async () => {
        mockFetch.mockResolvedValue(
          new Response('gateway content', { status: 200 }),
        )

        const handler = createArweaveHandler({})
        const response = await handler.fetch('ar://txId123')

        expect(await response.text()).toBe('gateway content')
        expect(mockFetch).toHaveBeenCalled()
        expect(mockCreateWayfinderClient).not.toHaveBeenCalled()
      })

      it('falls back to wayfinder when all static gateways fail', async () => {
        mockFetch.mockRejectedValue(new Error('all gateways down'))
        mockWayfinderRequest.mockResolvedValue(
          new Response('wayfinder content'),
        )

        const handler = createArweaveHandler({})
        const response = await handler.fetch('ar://txId123')

        expect(await response.text()).toBe('wayfinder content')
        expect(mockFetch).toHaveBeenCalled()
        expect(mockCreateWayfinderClient).toHaveBeenCalled()
        expect(mockWayfinderRequest).toHaveBeenCalledWith('ar://txId123')
      })

      it('lazily initializes wayfinder only on fallback', async () => {
        mockFetch.mockResolvedValue(new Response('ok', { status: 200 }))

        const handler = createArweaveHandler({})
        await handler.fetch('ar://txId123')

        expect(mockCreateWayfinderClient).not.toHaveBeenCalled()
      })

      it('reuses the same wayfinder instance across fallbacks', async () => {
        mockFetch.mockRejectedValue(new Error('down'))
        mockWayfinderRequest.mockResolvedValue(new Response('ok'))

        const handler = createArweaveHandler({})
        await handler.fetch('ar://txId1')
        await handler.fetch('ar://txId2')

        expect(mockCreateWayfinderClient).toHaveBeenCalledTimes(1)
      })
    })

    describe('with static gateways', () => {
      it('uses custom gateways when provided', async () => {
        mockFetch.mockResolvedValue(
          new Response('gateway content', { status: 200 }),
        )

        const handler = createArweaveHandler({
          arweave: { gateways: ['https://my-gateway.net'] },
        })
        const response = await handler.fetch('ar://txId123')

        expect(await response.text()).toBe('gateway content')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://my-gateway.net/txId123',
          expect.any(Object),
        )
      })

      it('does not use wayfinder when useNetworkDiscovery is false', async () => {
        mockFetch.mockRejectedValue(new Error('all down'))

        const handler = createArweaveHandler({
          arweave: { useNetworkDiscovery: false },
        })

        await expect(handler.fetch('ar://txId123')).rejects.toThrow(
          DwebFetchError,
        )
        expect(mockCreateWayfinderClient).not.toHaveBeenCalled()
      })

      it('tries gateways in order and returns first successful', async () => {
        mockFetch
          .mockRejectedValueOnce(new Error('gateway 1 down'))
          .mockResolvedValueOnce(
            new Response('from gateway 2', { status: 200 }),
          )

        const handler = createArweaveHandler({
          arweave: {
            gateways: ['https://gateway1.net', 'https://gateway2.net'],
            useNetworkDiscovery: false,
          },
        })
        const response = await handler.fetch('ar://txId123')

        expect(await response.text()).toBe('from gateway 2')
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      it('throws DwebFetchError when all gateways fail and no fallback', async () => {
        mockFetch.mockRejectedValue(new Error('all down'))

        const handler = createArweaveHandler({
          arweave: {
            gateways: ['https://gw1.net', 'https://gw2.net'],
            useNetworkDiscovery: false,
          },
        })

        await expect(handler.fetch('ar://txId123')).rejects.toThrow(
          DwebFetchError,
        )
        await expect(handler.fetch('ar://txId123')).rejects.toThrow(
          'All Arweave gateways failed',
        )
      })

      it('skips non-ok responses and tries next gateway', async () => {
        mockFetch
          .mockResolvedValueOnce(new Response('not found', { status: 404 }))
          .mockResolvedValueOnce(new Response('found', { status: 200 }))

        const handler = createArweaveHandler({
          arweave: {
            gateways: ['https://gw1.net', 'https://gw2.net'],
            useNetworkDiscovery: false,
          },
        })
        const response = await handler.fetch('ar://txId123')

        expect(await response.text()).toBe('found')
      })
    })

    describe('with routing strategy', () => {
      it('passes routingStrategy to createRoutingStrategy', async () => {
        mockFetch.mockRejectedValue(new Error('static down'))
        mockWayfinderRequest.mockResolvedValue(new Response('ok'))

        const handler = createArweaveHandler({
          arweave: { routingStrategy: 'fastest' },
        })
        await handler.fetch('ar://txId123')

        expect(mockCreateRoutingStrategy).toHaveBeenCalledWith({
          strategy: 'fastest',
        })
        expect(mockCreateWayfinderClient).toHaveBeenCalledWith({
          routingStrategy: 'mock-strategy',
        })
      })

      it('does not pass routingStrategy when not configured', async () => {
        mockFetch.mockRejectedValue(new Error('static down'))
        mockWayfinderRequest.mockResolvedValue(new Response('ok'))

        const handler = createArweaveHandler({})
        await handler.fetch('ar://txId123')

        expect(mockCreateRoutingStrategy).not.toHaveBeenCalled()
        expect(mockCreateWayfinderClient).toHaveBeenCalledWith({})
      })
    })

    it('wraps errors in DwebFetchError', async () => {
      mockFetch.mockRejectedValue(new Error('static down'))
      mockWayfinderRequest.mockRejectedValue(new Error('wayfinder error'))

      const handler = createArweaveHandler({})

      await expect(handler.fetch('ar://txId123')).rejects.toThrow(
        DwebFetchError,
      )
    })
  })

  describe('resolveUrl', () => {
    it('uses static gateway resolution by default', async () => {
      const handler = createArweaveHandler({})
      const result = await handler.resolveUrl('ar://txId123')

      expect(result).toBe('https://arweave.net/txId123')
      expect(mockCreateWayfinderClient).not.toHaveBeenCalled()
    })

    it('uses primary static gateway when gateways are configured', async () => {
      const handler = createArweaveHandler({
        arweave: { gateways: ['https://my-gw.net', 'https://other-gw.net'] },
      })
      const result = await handler.resolveUrl('ar://txId123')

      expect(result).toBe('https://my-gw.net/txId123')
      expect(mockCreateWayfinderClient).not.toHaveBeenCalled()
    })

    it('uses default static gateway when useNetworkDiscovery is false', async () => {
      const handler = createArweaveHandler({
        arweave: { useNetworkDiscovery: false },
      })
      const result = await handler.resolveUrl('ar://txId123')

      expect(result).toBe('https://arweave.net/txId123')
    })

    it('strips trailing slashes from gateway URL', async () => {
      const handler = createArweaveHandler({
        arweave: { gateways: ['https://my-gw.net/'] },
      })
      const result = await handler.resolveUrl('ar://txId123')

      expect(result).toBe('https://my-gw.net/txId123')
    })
  })
})
