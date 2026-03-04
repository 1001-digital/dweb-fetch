import type { DwebFetchOptions, ProtocolHandler } from '../types'

export function createHttpsHandler(): ProtocolHandler {
  return {
    async fetch(url: string, options?: DwebFetchOptions): Promise<Response> {
      return globalThis.fetch(url, {
        method: options?.method,
        headers: options?.headers
          ? new Headers(options.headers)
          : undefined,
        body: options?.body,
        signal: options?.signal,
      })
    },

    async resolveUrl(url: string): Promise<string> {
      return url
    },
  }
}
