import type { DwebFetchConfig, DwebFetchOptions, ProtocolHandler } from '../types'
import { DwebFetchError } from '../errors'

const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io'

type VerifiedFetchFn = typeof fetch & { stop?: () => Promise<void> }

function toGatewayUrl(base: string, url: string): string {
  const b = base.replace(/\/+$/, '')
  if (url.startsWith('ipfs://')) return `${b}/ipfs/${url.slice(7)}`
  if (url.startsWith('ipns://')) return `${b}/ipns/${url.slice(7)}`
  return `${b}/ipfs/${url}`
}

async function fetchFromGateways(
  url: string,
  gateways: string[],
  options?: DwebFetchOptions,
): Promise<Response> {
  let lastError: unknown
  for (const gw of gateways) {
    try {
      const gwUrl = toGatewayUrl(gw, url)
      const response = await globalThis.fetch(gwUrl, {
        signal: options?.signal,
        headers: options?.headers
          ? new Headers(options.headers)
          : undefined,
      })
      if (response.ok) return response
      lastError = new Error(`Gateway ${gw} returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export function createIpfsHandler(config: DwebFetchConfig): ProtocolHandler {
  const gateways = config.ipfs?.gateways?.length
    ? config.ipfs.gateways
    : [DEFAULT_IPFS_GATEWAY]

  if (config.ipfs?.mode === 'gateway') {
    return createGatewayHandler(gateways)
  }

  return createVerifiedHandler(config, gateways)
}

function createGatewayHandler(gateways: string[]): ProtocolHandler {
  return {
    async fetch(url: string, options?: DwebFetchOptions): Promise<Response> {
      try {
        return await fetchFromGateways(url, gateways, options)
      } catch (error) {
        throw new DwebFetchError(`IPFS fetch failed for ${url}`, {
          cause: error,
        })
      }
    },

    async resolveUrl(url: string): Promise<string> {
      return toGatewayUrl(gateways[0], url)
    },
  }
}

function createVerifiedHandler(
  config: DwebFetchConfig,
  gateways: string[],
): ProtocolHandler {
  let verifiedFetchPromise: Promise<VerifiedFetchFn> | null = null

  async function getVerifiedFetch(): Promise<VerifiedFetchFn> {
    if (!verifiedFetchPromise) {
      verifiedFetchPromise = initVerifiedFetch(config)
    }
    return verifiedFetchPromise
  }

  return {
    async fetch(url: string, options?: DwebFetchOptions): Promise<Response> {
      let primaryResponse: Response | undefined
      let primaryError: unknown
      try {
        const vFetch = await getVerifiedFetch()
        primaryResponse = await vFetch(url, {
          signal: options?.signal,
          headers: options?.headers
            ? new Headers(options.headers)
            : undefined,
        })
        if (primaryResponse.ok) return primaryResponse
      } catch (error) {
        primaryError = error
      }

      try {
        return await fetchFromGateways(url, gateways, options)
      } catch (fallbackError) {
        if (primaryResponse) return primaryResponse
        throw new DwebFetchError(`IPFS fetch failed for ${url}`, {
          cause: primaryError ?? fallbackError,
        })
      }
    },

    async resolveUrl(url: string): Promise<string> {
      return toGatewayUrl(gateways[0], url)
    },

    async destroy() {
      if (verifiedFetchPromise) {
        const vFetch = await verifiedFetchPromise
        verifiedFetchPromise = null
        await vFetch.stop?.()
      }
    },
  }
}

async function initVerifiedFetch(
  config: DwebFetchConfig,
): Promise<VerifiedFetchFn> {
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

  return verifiedFetch as unknown as VerifiedFetchFn
}
