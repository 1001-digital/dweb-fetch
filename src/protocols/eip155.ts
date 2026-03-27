import type {
  DwebClient,
  DwebFetchOptions,
  Eip155Config,
  ProtocolHandler,
} from '../types'
import { DwebFetchError, Eip155ResolutionError } from '../errors'
import { parseEip155Uri } from '../utils/parse-url'
import { encodeTokenUriCall, encodeUriCall, decodeAbiString } from '../utils/abi'

export function createEip155Handler(
  config: Eip155Config,
  getClient: () => DwebClient,
): ProtocolHandler {
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

    const callData = standard === 'erc721'
      ? encodeTokenUriCall(tokenId)
      : encodeUriCall(tokenId)

    const result = await callRpc(rpcUrl, contract, callData, signal)

    if (!result || result === '0x') {
      throw new Eip155ResolutionError(
        `Empty tokenURI for ${uri}`,
        { chainId, contract, tokenId },
      )
    }

    let tokenUri = decodeAbiString(result)

    // ERC-1155: substitute {id} placeholder with hex-encoded token ID
    if (standard === 'erc1155' && tokenUri.includes('{id}')) {
      const hexId = BigInt(tokenId).toString(16).padStart(64, '0')
      tokenUri = tokenUri.replace('{id}', hexId)
    }

    return tokenUri
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
        return await getClient().resolveUrl(tokenUri)
      } catch (error) {
        if (error instanceof DwebFetchError) throw error
        throw new DwebFetchError(`EIP-155 URL resolution failed for ${url}`, {
          cause: error,
        })
      }
    },
  }
}
