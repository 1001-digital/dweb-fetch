const TOKEN_URI_SELECTOR = 'c87b56dd'
const URI_SELECTOR = '0e89341c'

const decoder = new TextDecoder()

const MAX_UINT256 = (1n << 256n) - 1n

export function padUint256(value: string): string {
  const n = BigInt(value)
  if (n < 0n || n > MAX_UINT256) {
    throw new Error(`Value out of uint256 range: ${value}`)
  }
  return n.toString(16).padStart(64, '0')
}

export function encodeTokenUriCall(tokenId: string): string {
  return '0x' + TOKEN_URI_SELECTOR + padUint256(tokenId)
}

export function encodeUriCall(tokenId: string): string {
  return '0x' + URI_SELECTOR + padUint256(tokenId)
}

export function decodeAbiString(hex: string): string {
  const data = hex.startsWith('0x') ? hex.slice(2) : hex

  if (data.length < 128) {
    return hexToUtf8(data)
  }

  const offset = safeParse64Hex(data.slice(0, 64)) * 2
  const length = safeParse64Hex(data.slice(offset, offset + 64))
  const strHex = data.slice(offset + 64, offset + 64 + length * 2)
  return hexToUtf8(strHex)
}

function safeParse64Hex(hex: string): number {
  const n = Number(BigInt('0x' + hex))
  if (!Number.isSafeInteger(n)) {
    throw new Error('ABI value exceeds safe integer range')
  }
  return n
}

function hexToUtf8(hex: string): string {
  if (!hex) return ''
  const len = hex.length >>> 1
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return decoder.decode(bytes)
}
