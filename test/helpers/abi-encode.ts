export function abiEncodeString(str: string): string {
  const length = str.length
  const lengthHex = length.toString(16).padStart(64, '0')
  const dataHex = Buffer.from(str).toString('hex').padEnd(
    Math.ceil(length / 32) * 64,
    '0',
  )
  return (
    '0x' +
    '0000000000000000000000000000000000000000000000000000000000000020' +
    lengthHex +
    dataHex
  )
}
