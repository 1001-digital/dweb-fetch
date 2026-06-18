import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIpfsHandler } from '../../src/protocols/ipfs'
import { DwebFetchError } from '../../src/errors'

const mockVerifiedFetch = vi.fn()
const mockCreateVerifiedFetch = vi.fn()

vi.mock('@helia/verified-fetch', () => ({
  createVerifiedFetch: (...args: unknown[]) =>
    mockCreateVerifiedFetch(...args),
}))

describe('createIpfsHandler', () => {
  beforeEach(() => {
    mockVerifiedFetch.mockReset()
    mockCreateVerifiedFetch.mockReset()
    mockCreateVerifiedFetch.mockResolvedValue(mockVerifiedFetch)
  })

  it('fetches ipfs:// URLs', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('ipfs content'))

    const handler = createIpfsHandler({})
    const response = await handler.fetch('ipfs://bafyABC')

    expect(await response.text()).toBe('ipfs content')
    expect(mockVerifiedFetch).toHaveBeenCalledWith('ipfs://bafyABC', {
      signal: undefined,
      headers: undefined,
    })
  })

  it('fetches ipns:// URLs', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('ipns content'))

    const handler = createIpfsHandler({})
    const response = await handler.fetch('ipns://example.eth')

    expect(await response.text()).toBe('ipns content')
  })

  it('passes gateways config to createVerifiedFetch', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('ok'))

    const handler = createIpfsHandler({
      ipfs: { gateways: ['https://my-gateway.io'] },
    })
    await handler.fetch('ipfs://bafyABC')

    expect(mockCreateVerifiedFetch).toHaveBeenCalledWith({
      gateways: ['https://my-gateway.io'],
    })
  })

  it('passes routers config to createVerifiedFetch', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('ok'))

    const handler = createIpfsHandler({
      ipfs: { routers: ['https://my-router.io'] },
    })
    await handler.fetch('ipfs://bafyABC')

    expect(mockCreateVerifiedFetch).toHaveBeenCalledWith({
      gateways: [],
      routers: ['https://my-router.io'],
    })
  })

  it('lazily initializes verified-fetch on first call', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('ok'))

    const handler = createIpfsHandler({})
    expect(mockCreateVerifiedFetch).not.toHaveBeenCalled()

    await handler.fetch('ipfs://bafyABC')
    expect(mockCreateVerifiedFetch).toHaveBeenCalledTimes(1)
  })

  it('reuses the same verified-fetch instance across calls', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('ok'))

    const handler = createIpfsHandler({})
    await handler.fetch('ipfs://bafyABC')
    await handler.fetch('ipfs://bafyDEF')

    expect(mockCreateVerifiedFetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to gateway HTTP fetch when verified-fetch fails', async () => {
    mockVerifiedFetch.mockRejectedValue(new Error('helia error'))
    const mockFetch = vi.fn().mockResolvedValue(new Response('gateway content', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const handler = createIpfsHandler({
      ipfs: { gateways: ['https://my-gw.io'] },
    })
    const response = await handler.fetch('ipfs://bafyABC/file.json')

    expect(await response.text()).toBe('gateway content')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://my-gw.io/ipfs/bafyABC/file.json',
      expect.objectContaining({ signal: undefined }),
    )

    vi.unstubAllGlobals()
  })

  it('does not throw on destroy after verified-fetch initialization fails', async () => {
    mockCreateVerifiedFetch.mockRejectedValue(new Error('missing verified-fetch'))
    const mockFetch = vi.fn().mockResolvedValue(new Response('gateway content', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const handler = createIpfsHandler({})
    await handler.fetch('ipfs://bafyABC')

    await expect(handler.destroy?.()).resolves.toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('tries all gateways in fallback before failing', async () => {
    mockVerifiedFetch.mockRejectedValue(new Error('helia error'))
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('gw1 down'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const handler = createIpfsHandler({
      ipfs: { gateways: ['https://gw1.io', 'https://gw2.io'] },
    })
    const response = await handler.fetch('ipfs://bafyABC')

    expect(await response.text()).toBe('ok')
    expect(mockFetch).toHaveBeenCalledTimes(2)

    vi.unstubAllGlobals()
  })

  it('wraps errors in DwebFetchError when all fallbacks fail', async () => {
    mockVerifiedFetch.mockRejectedValue(new Error('network error'))
    const mockFetch = vi.fn().mockRejectedValue(new Error('gw down'))
    vi.stubGlobal('fetch', mockFetch)

    const handler = createIpfsHandler({})

    await expect(handler.fetch('ipfs://bafyABC')).rejects.toThrow(
      DwebFetchError,
    )
    await expect(handler.fetch('ipfs://bafyABC')).rejects.toThrow(
      'IPFS fetch failed for ipfs://bafyABC',
    )

    vi.unstubAllGlobals()
  })

  it('falls back to gateway when verified-fetch returns a non-OK response', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('upstream error', { status: 502 }))
    const mockFetch = vi.fn().mockResolvedValue(new Response('gateway content', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const handler = createIpfsHandler({
      ipfs: { gateways: ['https://my-gw.io'] },
    })
    const response = await handler.fetch('ipfs://bafyABC/file.json')

    expect(response.ok).toBe(true)
    expect(await response.text()).toBe('gateway content')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://my-gw.io/ipfs/bafyABC/file.json',
      expect.objectContaining({ signal: undefined }),
    )

    vi.unstubAllGlobals()
  })

  it('returns the verified-fetch response when gateway fallback also fails', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('upstream error', { status: 502 }))
    const mockFetch = vi.fn().mockRejectedValue(new Error('gw down'))
    vi.stubGlobal('fetch', mockFetch)

    const handler = createIpfsHandler({
      ipfs: { gateways: ['https://my-gw.io'] },
    })
    const response = await handler.fetch('ipfs://bafyABC')

    expect(response.status).toBe(502)
    expect(await response.text()).toBe('upstream error')

    vi.unstubAllGlobals()
  })

  it('passes signal and headers options', async () => {
    mockVerifiedFetch.mockResolvedValue(new Response('ok'))

    const controller = new AbortController()
    const handler = createIpfsHandler({})
    await handler.fetch('ipfs://bafyABC', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    const call = mockVerifiedFetch.mock.calls[0]
    expect(call[1].signal).toBe(controller.signal)
    expect(call[1].headers).toBeInstanceOf(Headers)
  })

  describe('resolveUrl', () => {
    it('resolves ipfs:// to default gateway URL', async () => {
      const handler = createIpfsHandler({})
      const result = await handler.resolveUrl('ipfs://bafyABC/file.json')
      expect(result).toBe('https://ipfs.io/ipfs/bafyABC/file.json')
    })

    it('resolves ipns:// to gateway URL', async () => {
      const handler = createIpfsHandler({})
      const result = await handler.resolveUrl('ipns://example.eth')
      expect(result).toBe('https://ipfs.io/ipns/example.eth')
    })

    it('uses first configured gateway', async () => {
      const handler = createIpfsHandler({
        ipfs: { gateways: ['https://my-gw.io', 'https://other-gw.io'] },
      })
      const result = await handler.resolveUrl('ipfs://bafyABC')
      expect(result).toBe('https://my-gw.io/ipfs/bafyABC')
    })

    it('handles raw CID as ipfs path', async () => {
      const handler = createIpfsHandler({})
      const result = await handler.resolveUrl('bafyABC')
      expect(result).toBe('https://ipfs.io/ipfs/bafyABC')
    })

    it('does not initialize verified-fetch backend', async () => {
      const handler = createIpfsHandler({})
      await handler.resolveUrl('ipfs://bafyABC')
      expect(mockCreateVerifiedFetch).not.toHaveBeenCalled()
    })
  })

  describe("mode: 'gateway'", () => {
    it('does not import or initialize verified-fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://my-gw.io'] },
      })
      await handler.fetch('ipfs://bafyABC')
      await handler.fetch('ipfs://bafyDEF')

      expect(mockCreateVerifiedFetch).not.toHaveBeenCalled()
      expect(mockVerifiedFetch).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })

    it('fetches directly from the first configured gateway', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('content', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://my-gw.io'] },
      })
      const response = await handler.fetch('ipfs://bafyABC/file.json')

      expect(await response.text()).toBe('content')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://my-gw.io/ipfs/bafyABC/file.json',
        expect.objectContaining({ signal: undefined }),
      )
      expect(mockFetch).toHaveBeenCalledTimes(1)

      vi.unstubAllGlobals()
    })

    it('falls back to the next gateway when the first fails', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('gw1 down'))
        .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://gw1.io', 'https://gw2.io'] },
      })
      const response = await handler.fetch('ipfs://bafyABC')

      expect(await response.text()).toBe('ok')
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://gw2.io/ipfs/bafyABC',
        expect.any(Object),
      )

      vi.unstubAllGlobals()
    })

    it('falls back when a gateway returns a non-OK response', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(new Response('bad', { status: 502 }))
        .mockResolvedValueOnce(new Response('good', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://gw1.io', 'https://gw2.io'] },
      })
      const response = await handler.fetch('ipfs://bafyABC')

      expect(response.status).toBe(200)
      expect(await response.text()).toBe('good')

      vi.unstubAllGlobals()
    })

    it('wraps errors in DwebFetchError when all gateways fail', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('gw down'))
      vi.stubGlobal('fetch', mockFetch)

      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://gw1.io', 'https://gw2.io'] },
      })

      await expect(handler.fetch('ipfs://bafyABC')).rejects.toThrow(DwebFetchError)
      await expect(handler.fetch('ipfs://bafyABC')).rejects.toThrow(
        'IPFS fetch failed for ipfs://bafyABC',
      )

      vi.unstubAllGlobals()
    })

    it('uses the default gateway when none are configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const handler = createIpfsHandler({ ipfs: { mode: 'gateway' } })
      await handler.fetch('ipfs://bafyABC')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://ipfs.io/ipfs/bafyABC',
        expect.any(Object),
      )

      vi.unstubAllGlobals()
    })

    it('forwards signal and headers to the gateway fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
      vi.stubGlobal('fetch', mockFetch)

      const controller = new AbortController()
      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://my-gw.io'] },
      })
      await handler.fetch('ipfs://bafyABC', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })

      const call = mockFetch.mock.calls[0]
      expect(call[1].signal).toBe(controller.signal)
      expect(call[1].headers).toBeInstanceOf(Headers)
      expect((call[1].headers as Headers).get('Accept')).toBe('application/json')

      vi.unstubAllGlobals()
    })

    it('resolves ipfs:// URLs using the first configured gateway', async () => {
      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://my-gw.io', 'https://other-gw.io'] },
      })
      const result = await handler.resolveUrl('ipfs://bafyABC/file.json')
      expect(result).toBe('https://my-gw.io/ipfs/bafyABC/file.json')
    })

    it('resolves ipns:// URLs using the first configured gateway', async () => {
      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://my-gw.io'] },
      })
      const result = await handler.resolveUrl('ipns://example.eth')
      expect(result).toBe('https://my-gw.io/ipns/example.eth')
    })

    it('exposes no destroy method (no resources to release)', () => {
      const handler = createIpfsHandler({
        ipfs: { mode: 'gateway', gateways: ['https://my-gw.io'] },
      })
      expect(handler.destroy).toBeUndefined()
    })
  })
})
