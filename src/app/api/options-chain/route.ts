import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  const expiration = req.nextUrl.searchParams.get('expiration')

  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  const provider = getProvider('yahoo')

  try {
    if (!expiration) {
      const expirations = await provider.getAvailableExpirations(ticker)
      return NextResponse.json({ expirations })
    }
    const strikes = await provider.getAvailableStrikes(ticker, expiration)
    return NextResponse.json({ strikes })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
