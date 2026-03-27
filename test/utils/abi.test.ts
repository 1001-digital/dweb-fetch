import { describe, it, expect } from 'vitest'
import { encodeTokenUriCall, encodeUriCall, decodeAbiString } from '../../src/utils/abi'
import { abiEncodeString } from '../helpers/abi-encode'

describe('encodeTokenUriCall', () => {
  it('encodes tokenURI(uint256) with token ID 1', () => {
    const result = encodeTokenUriCall('1')
    expect(result).toBe(
      '0xc87b56dd' + '0000000000000000000000000000000000000000000000000000000000000001',
    )
  })

  it('encodes tokenURI(uint256) with token ID 0', () => {
    const result = encodeTokenUriCall('0')
    expect(result).toBe(
      '0xc87b56dd' + '0000000000000000000000000000000000000000000000000000000000000000',
    )
  })

  it('encodes large token IDs', () => {
    const result = encodeTokenUriCall('1234567890')
    expect(result).toBe(
      '0xc87b56dd' + '00000000000000000000000000000000000000000000000000000000499602d2',
    )
  })
})

describe('encodeUriCall', () => {
  it('encodes uri(uint256) with token ID 1', () => {
    const result = encodeUriCall('1')
    expect(result).toBe(
      '0x0e89341c' + '0000000000000000000000000000000000000000000000000000000000000001',
    )
  })
})

describe('decodeAbiString', () => {
  it('decodes a standard ABI-encoded string', () => {
    const str = 'https://example.com/metadata.json'
    expect(decodeAbiString(abiEncodeString(str))).toBe(str)
  })

  it('decodes an ABI-encoded IPFS URI', () => {
    const str = 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    expect(decodeAbiString(abiEncodeString(str))).toBe(str)
  })

  it('handles hex without 0x prefix', () => {
    const encoded = abiEncodeString('hello').slice(2) // strip 0x
    expect(decodeAbiString(encoded)).toBe('hello')
  })

  it('falls back to raw hex-to-utf8 for short data', () => {
    const str = 'hi'
    const hex = '0x' + Buffer.from(str).toString('hex')
    expect(decodeAbiString(hex)).toBe(str)
  })
})
