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

  it('wraps errors in DwebFetchError', async () => {
    mockVerifiedFetch.mockRejectedValue(new Error('network error'))

    const handler = createIpfsHandler({})

    await expect(handler.fetch('ipfs://bafyABC')).rejects.toThrow(
      DwebFetchError,
    )
    await expect(handler.fetch('ipfs://bafyABC')).rejects.toThrow(
      'IPFS fetch failed for ipfs://bafyABC',
    )
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
})
