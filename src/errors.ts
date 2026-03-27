export class DwebFetchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DwebFetchError'
  }
}

export class DwebUnsupportedProtocolError extends DwebFetchError {
  public readonly scheme: string

  constructor(scheme: string) {
    super(`Unsupported protocol scheme: "${scheme}://"`)
    this.name = 'DwebUnsupportedProtocolError'
    this.scheme = scheme
  }
}

export class Eip155ResolutionError extends DwebFetchError {
  public readonly chainId: number
  public readonly contract: string
  public readonly tokenId: string

  constructor(
    message: string,
    details: { chainId: number; contract: string; tokenId: string },
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'Eip155ResolutionError'
    this.chainId = details.chainId
    this.contract = details.contract
    this.tokenId = details.tokenId
  }
}
