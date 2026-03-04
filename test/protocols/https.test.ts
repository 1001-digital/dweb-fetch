import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHttpsHandler } from '../../src/protocols/https'

describe('createHttpsHandler', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  it('passes through to globalThis.fetch', async () => {
    const response = new Response('ok')
    mockFetch.mockResolvedValue(response)

    const handler = createHttpsHandler()
    const result = await handler.fetch('https://example.com')

    expect(result).toBe(response)
    expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
      method: undefined,
      headers: undefined,
      body: undefined,
      signal: undefined,
    })
  })

  it('passes method, headers, body, and signal', async () => {
    mockFetch.mockResolvedValue(new Response('ok'))

    const controller = new AbortController()
    const handler = createHttpsHandler()
    await handler.fetch('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"key":"value"}',
      signal: controller.signal,
    })

    const call = mockFetch.mock.calls[0]
    expect(call[0]).toBe('https://example.com/api')
    expect(call[1].method).toBe('POST')
    expect(call[1].body).toBe('{"key":"value"}')
    expect(call[1].signal).toBe(controller.signal)
    expect(call[1].headers).toBeInstanceOf(Headers)
  })

  it('resolveUrl returns URL as-is', async () => {
    const handler = createHttpsHandler()
    const result = await handler.resolveUrl('https://example.com/image.png')
    expect(result).toBe('https://example.com/image.png')
  })
})
