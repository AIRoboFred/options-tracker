export interface StockQuote {
  ticker: string
  price: number
  timestamp: Date
}

export interface OptionQuote {
  symbol: string
  expiration: string
  strike: number
  type: 'call' | 'put'
  bid: number
  ask: number
  last: number
  iv: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  openInterest: number | null
  volume: number | null
}

export interface OptionRequest {
  expiration: string // YYYY-MM-DD
  strike: number
  type: 'call' | 'put'
}

export interface DataProvider {
  name: string
  getStockQuote(ticker: string): Promise<StockQuote>
  getOptionQuote(ticker: string, option: OptionRequest): Promise<OptionQuote>
  getAvailableExpirations(ticker: string): Promise<string[]>
  getAvailableStrikes(ticker: string, expiration: string): Promise<number[]>
}
