import { describe, it, expect } from 'vitest'
import { extractScheme, parseDwebUrl } from '../../src/utils/parse-url'

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
