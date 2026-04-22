import type {
  DwebClient,
  DwebFetchOptions,
  Eip155Config,
  ProtocolHandler,
} from '../types'
import { DwebFetchError, Eip155ResolutionError } from '../errors'
import { parseEip155Uri } from '../utils/parse-url'
import { encodeTokenUriCall, encodeUriCall, decodeAbiString, padUint256 } from '../utils/abi'

export type Eip155TokenStandard = 'erc721' | 'erc1155'

export interface ResolveEip155TokenUriOptions {
  chainId: number
  standard: Eip155TokenStandard
  contract: string
  tokenId: string
  rpcUrl: string
  signal?: AbortSignal
}

async function callRpc(
  rpcUrl: string,
  contract: string,
  data: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await globalThis.fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: contract, data }, 'latest'],
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`RPC returned ${response.status}`)
  }

  const json = await response.json()
  if (json.error) {
    throw new Error(json.error.message || 'RPC error')
  }

  return json.result
}

export async function resolveEip155TokenUri({
  chainId,
  standard,
  contract,
  tokenId,
  rpcUrl,
  signal,
}: ResolveEip155TokenUriOptions): Promise<string> {
  const callData = standard === 'erc721'
    ? encodeTokenUriCall(tokenId)
    : encodeUriCall(tokenId)

  const result = await callRpc(rpcUrl, contract, callData, signal)

  if (!result || result === '0x') {
    throw new Eip155ResolutionError(
      `Empty tokenURI for eip155:${chainId}/${standard}:${contract}/${tokenId}`,
      { chainId, contract, tokenId },
    )
  }

  let tokenUri = decodeAbiString(result)

  // Per ERC-1155 metadata URI spec
  if (standard === 'erc1155' && tokenUri.includes('{id}')) {
    tokenUri = tokenUri.replaceAll('{id}', padUint256(tokenId))
  }

  return tokenUri
}

export function createEip155Handler(
  config: Eip155Config,
  getClient: () => DwebClient,
): ProtocolHandler {
  async function resolveTokenUri(
    uri: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const parsed = parseEip155Uri(uri)
    if (!parsed) {
      throw new DwebFetchError(`Invalid EIP-155 URI: ${uri}`)
    }

    const { chainId, standard, contract, tokenId } = parsed
    const rpcUrl = config.rpcUrls[chainId]
    if (!rpcUrl) {
      throw new Eip155ResolutionError(
        `No RPC URL configured for chain ${chainId}`,
        { chainId, contract, tokenId },
      )
    }

    return resolveEip155TokenUri({
      chainId,
      standard,
      contract,
      tokenId,
      rpcUrl,
      signal,
    })
  }

  return {
    async fetch(url: string, options?: DwebFetchOptions): Promise<Response> {
      try {
        const tokenUri = await resolveTokenUri(url, options?.signal)
        return await getClient().fetch(tokenUri, options)
      } catch (error) {
        if (error instanceof DwebFetchError) throw error
        throw new DwebFetchError(`EIP-155 fetch failed for ${url}`, {
          cause: error,
        })
      }
    },

    async resolveUrl(url: string): Promise<string> {
      try {
        const tokenUri = await resolveTokenUri(url)

        // tokenURI points to metadata JSON, not the image itself.
        // Fetch metadata and extract the image URL.
        const response = await getClient().fetch(tokenUri)
        const metadata = await response.json()
        const imageUri = metadata.image || metadata.image_url

        if (!imageUri) {
          throw new Eip155ResolutionError(
            `No image in metadata for ${url}`,
            parseEip155Uri(url)!,
          )
        }

        if (imageUri.startsWith('data:')) return imageUri

        return await getClient().resolveUrl(imageUri)
      } catch (error) {
        if (error instanceof DwebFetchError) throw error
        throw new DwebFetchError(`EIP-155 URL resolution failed for ${url}`, {
          cause: error,
        })
      }
    },
  }
}
