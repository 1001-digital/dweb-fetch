export interface DwebFetchConfig {
  ipfs?: IpfsConfig
  arweave?: ArweaveConfig
}

export interface IpfsConfig {
  gateways?: string[]
  routers?: string[]
}

export type ArweaveRoutingStrategy =
  | 'random'
  | 'fastest'
  | 'balanced'
  | 'preferred'

export interface ArweaveConfig {
  gateways?: string[]
  routingStrategy?: ArweaveRoutingStrategy
  useNetworkDiscovery?: boolean
}

export interface DwebFetchOptions {
  signal?: AbortSignal
  headers?: HeadersInit
  method?: string
  body?: BodyInit | null
}

export type DwebFetch = (
  url: string,
  options?: DwebFetchOptions,
) => Promise<Response>

export interface DwebClient {
  fetch: DwebFetch
  resolveUrl: (url: string) => Promise<string>
}

export interface ProtocolHandler {
  fetch: (url: string, options?: DwebFetchOptions) => Promise<Response>
  resolveUrl: (url: string) => Promise<string>
  destroy?: () => Promise<void>
}

export type ProtocolHandlerFactory = (
  config: DwebFetchConfig,
) => ProtocolHandler

export type DwebScheme = 'ipfs' | 'ipns' | 'ar' | 'http' | 'https'
