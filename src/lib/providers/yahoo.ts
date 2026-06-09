// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require('yahoo-finance2').default as typeof import('yahoo-finance2').default
import type { DataProvider, StockQuote, OptionQuote, OptionRequest } from './types'

export const yahooProvider: DataProvider = {
  name: 'yahoo',

  async getStockQuote(ticker: string): Promise<StockQuote> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = await yahooFinance.quote(ticker) as any
    return {
      ticker,
      price: quote.regularMarketPrice ?? 0,
      timestamp: new Date(),
    }
  },

  async getOptionQuote(ticker: string, req: OptionRequest): Promise<OptionQuote> {
    const expirationDate = new Date(req.expiration + 'T00:00:00Z')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = await yahooFinance.options(ticker, { date: expirationDate }) as any

    const contracts = req.type === 'call' ? chain.options?.[0]?.calls : chain.options?.[0]?.puts
    if (!contracts) throw new Error(`No ${req.type}s found for ${ticker} ${req.expiration}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contract = contracts.find((c: any) => c.strike === req.strike)
    if (!contract) throw new Error(`Strike ${req.strike} not found for ${ticker} ${req.expiration} ${req.type}`)

    return {
      symbol: contract.contractSymbol,
      expiration: req.expiration,
      strike: req.strike,
      type: req.type,
      bid: contract.bid ?? 0,
      ask: contract.ask ?? 0,
      last: contract.lastPrice ?? 0,
      iv: contract.impliedVolatility ?? null,
      delta: null,
      gamma: null,
      theta: null,
      vega: null,
      openInterest: contract.openInterest ?? null,
      volume: contract.volume ?? null,
    }
  },

  async getAvailableExpirations(ticker: string): Promise<string[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = await yahooFinance.options(ticker) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (chain.expirationDates ?? []).map((d: any) =>
      new Date(d).toISOString().split('T')[0]
    )
  },

  async getAvailableStrikes(ticker: string, expiration: string): Promise<number[]> {
    const expirationDate = new Date(expiration + 'T00:00:00Z')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = await yahooFinance.options(ticker, { date: expirationDate }) as any
    const strikes = new Set<number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain.options?.[0]?.calls?.forEach((c: any) => strikes.add(c.strike))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain.options?.[0]?.puts?.forEach((c: any) => strikes.add(c.strike))
    return Array.from(strikes).sort((a, b) => a - b)
  },
}
