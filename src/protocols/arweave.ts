import type { ArweaveConfig, DwebFetchConfig, DwebFetchOptions, ProtocolHandler } from '../types'
import { DwebFetchError } from '../errors'

const DEFAULT_ARWEAVE_GATEWAYS = [
  'https://arweave.net',
  'https://ar-io.dev',
  'https://permagate.io',
]

interface ArweaveBackend {
  request: (url: string, options?: DwebFetchOptions) => Promise<Response>
  resolveUrl: (url: string) => Promise<string>
}

export function createArweaveHandler(
  config: DwebFetchConfig,
): ProtocolHandler {
  let backendPromise: Promise<ArweaveBackend> | null = null

  async function getBackend(): Promise<ArweaveBackend> {
    if (!backendPromise) {
      backendPromise = initBackend(config)
    }
    return backendPromise
  }

  return {
    async fetch(url: string, options?: DwebFetchOptions): Promise<Response> {
      try {
        const backend = await getBackend()
        return await backend.request(url, options)
      } catch (error) {
        if (error instanceof DwebFetchError) throw error
        throw new DwebFetchError(`Arweave fetch failed for ${url}`, {
          cause: error,
        })
      }
    },

    async resolveUrl(url: string): Promise<string> {
      try {
        const backend = await getBackend()
        return await backend.resolveUrl(url)
      } catch (error) {
        if (error instanceof DwebFetchError) throw error
        throw new DwebFetchError(
          `Arweave URL resolution failed for ${url}`,
          { cause: error },
        )
      }
    },

    async destroy() {
      backendPromise = null
    },
  }
}

async function initBackend(
  config: DwebFetchConfig,
): Promise<ArweaveBackend> {
  const arConfig = config.arweave
  const gateways = arConfig?.gateways?.length
    ? arConfig.gateways
    : DEFAULT_ARWEAVE_GATEWAYS

  const staticBackend = createStaticBackend(gateways)

  if (arConfig?.useNetworkDiscovery === false) {
    return staticBackend
  }

  return createCompositeBackend(staticBackend, arConfig)
}

function createCompositeBackend(
  staticBackend: ArweaveBackend,
  arConfig?: ArweaveConfig,
): ArweaveBackend {
  let wayfinderBackend: ArweaveBackend | null = null

  async function getWayfinderBackend(): Promise<ArweaveBackend | null> {
    if (wayfinderBackend) return wayfinderBackend
    try {
      const { createWayfinderClient, createRoutingStrategy } =
        await import('@ar.io/wayfinder-core')
      const options = arConfig?.routingStrategy
        ? { routingStrategy: createRoutingStrategy({ strategy: arConfig.routingStrategy }) }
        : {}
      const wayfinder = createWayfinderClient(options)
      wayfinderBackend = {
        async request(url: string): Promise<Response> {
          return wayfinder.request(url)
        },
        async resolveUrl(url: string): Promise<string> {
          const resolved = await wayfinder.resolveUrl({
            wayfinderUrl: url as `ar://${string}`,
          })
          return resolved.toString()
        },
      }
      return wayfinderBackend
    } catch {
      return null
    }
  }

  return {
    async request(url: string, options?: DwebFetchOptions): Promise<Response> {
      let staticError: unknown
      try {
        return await staticBackend.request(url, options)
      } catch (error) {
        staticError = error
      }

      const fallback = await getWayfinderBackend()
      if (fallback) return fallback.request(url, options)
      throw staticError
    },

    async resolveUrl(url: string): Promise<string> {
      try {
        return await staticBackend.resolveUrl(url)
      } catch (error) {
        const fallback = await getWayfinderBackend()
        if (fallback) return fallback.resolveUrl(url)
        throw error
      }
    },
  }
}

function createStaticBackend(gateways: string[]): ArweaveBackend {
  const primaryGateway = gateways[0].replace(/\/+$/, '')

  return {
    async request(
      url: string,
      options?: DwebFetchOptions,
    ): Promise<Response> {
      const path = url.replace(/^ar:\/\//, '')
      let lastError: unknown

      for (const gateway of gateways) {
        try {
          const base = gateway.replace(/\/+$/, '')
          const response = await globalThis.fetch(`${base}/${path}`, {
            signal: options?.signal,
            headers: options?.headers
              ? new Headers(options.headers)
              : undefined,
          })
          if (response.ok) return response
          lastError = new Error(
            `Gateway ${gateway} returned ${response.status}`,
          )
        } catch (error) {
          lastError = error
        }
      }

      throw new DwebFetchError(`All Arweave gateways failed for ${url}`, {
        cause: lastError as Error,
      })
    },

    async resolveUrl(url: string): Promise<string> {
      const path = url.replace(/^ar:\/\//, '')
      return `${primaryGateway}/${path}`
    },
  }
}
