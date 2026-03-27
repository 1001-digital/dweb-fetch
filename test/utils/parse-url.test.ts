import { describe, it, expect } from 'vitest'
import { extractScheme, parseDwebUrl, parseEip155Uri } from '../../src/utils/parse-url'

describe('extractScheme', () => {
  it('extracts ipfs scheme', () => {
    expect(extractScheme('ipfs://bafyABC')).toBe('ipfs')
  })

  it('extracts ipns scheme', () => {
    expect(extractScheme('ipns://example.eth')).toBe('ipns')
  })

  it('extracts ar scheme', () => {
    expect(extractScheme('ar://txId123')).toBe('ar')
  })

  it('extracts https scheme', () => {
    expect(extractScheme('https://example.com')).toBe('https')
  })

  it('extracts http scheme', () => {
    expect(extractScheme('http://example.com')).toBe('http')
  })

  it('lowercases the scheme', () => {
    expect(extractScheme('IPFS://bafyABC')).toBe('ipfs')
  })

  it('returns undefined for schemeless strings', () => {
    expect(extractScheme('bafyABC')).toBeUndefined()
    expect(extractScheme('/path/to/file')).toBeUndefined()
    expect(extractScheme('')).toBeUndefined()
  })
})

describe('parseDwebUrl', () => {
  it('parses ipfs URL', () => {
    const result = parseDwebUrl('ipfs://bafyABC/file.json')
    expect(result).toEqual({
      scheme: 'ipfs',
      raw: 'ipfs://bafyABC/file.json',
      path: 'bafyABC/file.json',
    })
  })

  it('parses ar URL', () => {
    const result = parseDwebUrl('ar://txId123')
    expect(result).toEqual({
      scheme: 'ar',
      raw: 'ar://txId123',
      path: 'txId123',
    })
  })

  it('parses https URL', () => {
    const result = parseDwebUrl('https://example.com/path')
    expect(result).toEqual({
      scheme: 'https',
      raw: 'https://example.com/path',
      path: 'example.com/path',
    })
  })

  it('returns undefined for unsupported schemes', () => {
    expect(parseDwebUrl('ftp://example.com')).toBeUndefined()
    expect(parseDwebUrl('magnet:?xt=abc')).toBeUndefined()
  })

  it('returns undefined for schemeless strings', () => {
    expect(parseDwebUrl('just-a-string')).toBeUndefined()
  })
})

describe('parseEip155Uri', () => {
  it('parses ERC-721 URI', () => {
    const result = parseEip155Uri(
      'eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1234',
    )
    expect(result).toEqual({
      chainId: 1,
      standard: 'erc721',
      contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      tokenId: '1234',
    })
  })

  it('parses ERC-1155 URI', () => {
    const result = parseEip155Uri(
      'eip155:137/erc1155:0x2953399124F0cBB46d2CbACD8A89cF0599974963/5',
    )
    expect(result).toEqual({
      chainId: 137,
      standard: 'erc1155',
      contract: '0x2953399124F0cBB46d2CbACD8A89cF0599974963',
      tokenId: '5',
    })
  })

  it('handles case-insensitive standard', () => {
    const result = parseEip155Uri(
      'eip155:1/ERC721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1',
    )
    expect(result?.standard).toBe('erc721')
  })

  it('returns undefined for missing token ID', () => {
    expect(
      parseEip155Uri('eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'),
    ).toBeUndefined()
  })

  it('returns undefined for invalid format', () => {
    expect(parseEip155Uri('eip155://1/erc721:0xABC/1')).toBeUndefined()
    expect(parseEip155Uri('not-eip155')).toBeUndefined()
    expect(parseEip155Uri('')).toBeUndefined()
  })

  it('returns undefined for invalid contract address', () => {
    expect(parseEip155Uri('eip155:1/erc721:notanaddress/1')).toBeUndefined()
  })
})
