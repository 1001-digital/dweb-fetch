import { describe, it, expect } from 'vitest'
import { encodeTokenUriCall, encodeUriCall, decodeAbiString } from '../../src/utils/abi'

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
    const length = str.length
    const lengthHex = length.toString(16).padStart(64, '0')
    const dataHex = Buffer.from(str).toString('hex').padEnd(
      Math.ceil(length / 32) * 64,
      '0',
    )
    const encoded =
      '0x' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      lengthHex +
      dataHex

    expect(decodeAbiString(encoded)).toBe(str)
  })

  it('decodes an ABI-encoded IPFS URI', () => {
    const str = 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const length = str.length
    const lengthHex = length.toString(16).padStart(64, '0')
    const dataHex = Buffer.from(str).toString('hex').padEnd(
      Math.ceil(length / 32) * 64,
      '0',
    )
    const encoded =
      '0x' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      lengthHex +
      dataHex

    expect(decodeAbiString(encoded)).toBe(str)
  })

  it('handles hex without 0x prefix', () => {
    const str = 'hello'
    const length = str.length
    const lengthHex = length.toString(16).padStart(64, '0')
    const dataHex = Buffer.from(str).toString('hex').padEnd(64, '0')
    const encoded =
      '0000000000000000000000000000000000000000000000000000000000000020' +
      lengthHex +
      dataHex

    expect(decodeAbiString(encoded)).toBe(str)
  })

  it('falls back to raw hex-to-utf8 for short data', () => {
    const str = 'hi'
    const hex = '0x' + Buffer.from(str).toString('hex')
    expect(decodeAbiString(hex)).toBe(str)
  })
})
