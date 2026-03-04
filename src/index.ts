import type {
  DwebClient,
  DwebFetchConfig,
  DwebFetchOptions,
  ProtocolHandler,
} from './types'
import { DwebUnsupportedProtocolError } from './errors'
import { extractScheme } from './utils/parse-url'
import { createIpfsHandler } from './protocols/ipfs'
import { createArweaveHandler } from './protocols/arweave'
import { createHttpsHandler } from './protocols/https'

const RAW_IPFS_HASH = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z2-7]{56})/

export function createDwebFetch(config: DwebFetchConfig = {}): DwebClient {
  const ipfsHandler = createIpfsHandler(config)
  const arweaveHandler = createArweaveHandler(config)
  const httpsHandler = createHttpsHandler()

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

  return {
    async fetch(
      url: string,
      options?: DwebFetchOptions,
    ): Promise<Response> {
      if (RAW_IPFS_HASH.test(url)) {
        return ipfsHandler.fetch(`ipfs://${url}`, options)
      }

      return getHandler(url).fetch(url, options)
    },

    async resolveUrl(url: string): Promise<string> {
      if (!url) return ''
      if (url.startsWith('data:')) return url
      if (RAW_IPFS_HASH.test(url)) {
        return ipfsHandler.resolveUrl(`ipfs://${url}`)
      }

      return getHandler(url).resolveUrl(url)
    },
  }
}

export type {
  DwebClient,
  DwebFetch,
  DwebFetchConfig,
  DwebFetchOptions,
  DwebScheme,
  IpfsConfig,
  ArweaveConfig,
  ProtocolHandler,
  ProtocolHandlerFactory,
} from './types'

export { DwebFetchError, DwebUnsupportedProtocolError } from './errors'
export { extractScheme, parseDwebUrl } from './utils/parse-url'
export type { ParsedDwebUrl } from './utils/parse-url'
