import type {
  DwebClient,
  DwebFetchConfig,
  DwebFetchOptions,
  ProtocolHandler,
} from './types'
import { DwebFetchError, DwebUnsupportedProtocolError } from './errors'
import { extractScheme } from './utils/parse-url'
import { createIpfsHandler } from './protocols/ipfs'
import { createArweaveHandler } from './protocols/arweave'
import { createHttpsHandler } from './protocols/https'
import { createEip155Handler } from './protocols/eip155'

const RAW_IPFS_HASH = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z2-7]{56})/

function parseDataUri(uri: string): Response {
  const match = uri.match(/^data:([^,]*),(.*)$/s)
  if (!match) {
    throw new DwebFetchError('Malformed data: URI')
  }

  const meta = match[1]
  const rawData = match[2]
  const isBase64 = meta.endsWith(';base64')
  const mediaType = isBase64 ? meta.slice(0, -7) : meta

  const body = isBase64
    ? Uint8Array.from(atob(rawData), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(rawData))

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': mediaType || 'text/plain;charset=US-ASCII',
    },
  })
}

export function createDwebFetch(config: DwebFetchConfig = {}): DwebClient {
  const ipfsHandler = createIpfsHandler(config)
  const arweaveHandler = createArweaveHandler(config)
  const httpsHandler = createHttpsHandler()

  const eip155Handler = config.eip155
    ? createEip155Handler(config.eip155, () => client)
    : undefined

  const handlers: Record<string, ProtocolHandler> = {
    ipfs: ipfsHandler,
    ipns: ipfsHandler,
    ar: arweaveHandler,
    http: httpsHandler,
    https: httpsHandler,
  }

  function getHandler(url: string): ProtocolHandler {
    const scheme = extractScheme(url)
    if (!scheme) {
      throw new DwebUnsupportedProtocolError(url.split(':')[0] || 'unknown')
    }

    const handler = handlers[scheme]
    if (!handler) {
      throw new DwebUnsupportedProtocolError(scheme)
    }

    return handler
  }

  const allHandlers: ProtocolHandler[] = [
    ipfsHandler,
    arweaveHandler,
    httpsHandler,
    ...(eip155Handler ? [eip155Handler] : []),
  ]

  const client: DwebClient = {
    async fetch(
      url: string,
      options?: DwebFetchOptions,
    ): Promise<Response> {
      if (url.startsWith('data:')) {
        return parseDataUri(url)
      }

      if (url.startsWith('eip155:')) {
        if (!eip155Handler) {
          throw new DwebUnsupportedProtocolError('eip155')
        }
        return eip155Handler.fetch(url, options)
      }

      if (RAW_IPFS_HASH.test(url)) {
        return ipfsHandler.fetch(`ipfs://${url}`, options)
      }

      return getHandler(url).fetch(url, options)
    },

    async resolveUrl(url: string): Promise<string> {
      if (!url) return ''
      if (url.startsWith('data:')) return url

      if (url.startsWith('eip155:')) {
        if (!eip155Handler) {
          throw new DwebUnsupportedProtocolError('eip155')
        }
        return eip155Handler.resolveUrl(url)
      }

      if (RAW_IPFS_HASH.test(url)) {
        return ipfsHandler.resolveUrl(`ipfs://${url}`)
      }

      return getHandler(url).resolveUrl(url)
    },

    async destroy(): Promise<void> {
      await Promise.all(allHandlers.map((h) => h.destroy?.()))
    },
  }

  return client
}

export type {
  DwebClient,
  DwebFetch,
  DwebFetchConfig,
  DwebFetchOptions,
  DwebScheme,
  Eip155Config,
  IpfsConfig,
  ArweaveConfig,
  ProtocolHandler,
  ProtocolHandlerFactory,
} from './types'

export {
  DwebFetchError,
  DwebUnsupportedProtocolError,
  Eip155ResolutionError,
} from './errors'
export {
  resolveEip155TokenUri,
} from './protocols/eip155'
export type {
  Eip155TokenStandard,
  ResolveEip155TokenUriOptions,
} from './protocols/eip155'
export { extractScheme, parseDwebUrl, parseEip155Uri } from './utils/parse-url'
export type { ParsedDwebUrl, ParsedEip155Uri } from './utils/parse-url'
