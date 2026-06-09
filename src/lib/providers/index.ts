import type { DataProvider } from './types'
import { yahooProvider } from './yahoo'

export type ProviderName = 'yahoo'

export function getProvider(name: ProviderName = 'yahoo'): DataProvider {
  switch (name) {
    case 'yahoo': return yahooProvider
    default: return yahooProvider
  }
}

export type { DataProvider, StockQuote, OptionQuote, OptionRequest } from './types'
