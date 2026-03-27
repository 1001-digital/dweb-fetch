const TOKEN_URI_SELECTOR = 'c87b56dd'
const URI_SELECTOR = '0e89341c'

function padUint256(value: string): string {
  return BigInt(value).toString(16).padStart(64, '0')
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

  const offset = parseInt(data.slice(0, 64), 16) * 2
  const length = parseInt(data.slice(offset, offset + 64), 16)
  const strHex = data.slice(offset + 64, offset + 64 + length * 2)
  return hexToUtf8(strHex)
}

function hexToUtf8(hex: string): string {
  const bytes = new Uint8Array(
    hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)),
  )
  return new TextDecoder().decode(bytes)
}
