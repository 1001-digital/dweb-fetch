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
