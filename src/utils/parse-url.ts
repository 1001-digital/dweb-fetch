import type { DwebScheme } from '../types'

const SUPPORTED_SCHEMES = new Set<DwebScheme>([
  'ipfs',
  'ipns',
  'ar',
  'http',
  'https',
])

export interface ParsedDwebUrl {
  scheme: DwebScheme
  raw: string
  path: string
}

export function parseDwebUrl(url: string): ParsedDwebUrl | undefined {
  const match = url.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/i)
  if (!match) return undefined

  const scheme = match[1].toLowerCase() as DwebScheme
  if (!SUPPORTED_SCHEMES.has(scheme)) return undefined

  return {
    scheme,
    raw: url,
    path: match[2],
  }
}

export function extractScheme(url: string): string | undefined {
  const match = url.match(/^([a-z][a-z0-9+.-]*):\/\//i)
  return match ? match[1].toLowerCase() : undefined
}

export interface ParsedEip155Uri {
  chainId: number
  standard: 'erc721' | 'erc1155'
  contract: string
  tokenId: string
}

export function parseEip155Uri(uri: string): ParsedEip155Uri | undefined {
  const match = uri.match(
    /^eip155:(\d+)\/(erc721|erc1155):(0x[0-9a-fA-F]{40})\/(\d+)$/i,
  )
  if (!match) return undefined

  return {
    chainId: Number(match[1]),
    standard: match[2].toLowerCase() as 'erc721' | 'erc1155',
    contract: match[3],
    tokenId: match[4],
  }
}
