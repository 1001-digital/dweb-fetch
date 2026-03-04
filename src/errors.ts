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
