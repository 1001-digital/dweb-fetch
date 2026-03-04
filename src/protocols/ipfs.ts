import type { DwebFetchConfig, DwebFetchOptions, ProtocolHandler } from '../types'
import { DwebFetchError } from '../errors'

const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io'

export function createIpfsHandler(config: DwebFetchConfig): ProtocolHandler {
  let verifiedFetchPromise: Promise<typeof fetch> | null = null

  const gateway = config.ipfs?.gateways?.[0] ?? DEFAULT_IPFS_GATEWAY

  async function getVerifiedFetch(): Promise<typeof fetch> {
    if (!verifiedFetchPromise) {
      verifiedFetchPromise = initVerifiedFetch(config)
    }
    return verifiedFetchPromise
  }

  return {
    async fetch(url: string, options?: DwebFetchOptions): Promise<Response> {
      try {
        const vFetch = await getVerifiedFetch()
        return await vFetch(url, {
          signal: options?.signal,
          headers: options?.headers
            ? new Headers(options.headers)
            : undefined,
        })
      } catch (error) {
        if (error instanceof DwebFetchError) throw error
        throw new DwebFetchError(`IPFS fetch failed for ${url}`, {
          cause: error,
        })
      }
    },

    async resolveUrl(url: string): Promise<string> {
      const base = gateway.replace(/\/+$/, '')

      if (url.startsWith('ipfs://')) {
        return `${base}/ipfs/${url.slice(7)}`
      }
      if (url.startsWith('ipns://')) {
        return `${base}/ipns/${url.slice(7)}`
      }

      return `${base}/ipfs/${url}`
    },

    async destroy() {
      verifiedFetchPromise = null
    },
  }
}

async function initVerifiedFetch(
  config: DwebFetchConfig,
): Promise<typeof fetch> {
  const { createVerifiedFetch } = await import('@helia/verified-fetch')

  const gateways = config.ipfs?.gateways
  const routers = config.ipfs?.routers

  let verifiedFetch
  if (gateways?.length) {
    verifiedFetch = await createVerifiedFetch({
      gateways,
      ...(routers?.length ? { routers } : {}),
    })
  } else if (routers?.length) {
    verifiedFetch = await createVerifiedFetch({ gateways: [], routers })
  } else {
    verifiedFetch = await createVerifiedFetch()
  }

  return verifiedFetch as unknown as typeof fetch
}
