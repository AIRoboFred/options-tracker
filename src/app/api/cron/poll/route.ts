import { NextResponse } from 'next/server'
import { getSettings, recordPollSuccess, recordPollError } from '@/lib/settings'
import { getProvider } from '@/lib/providers'
import { ensureHeaders, appendPollRow } from '@/lib/google-sheets'
import { redis as kv } from '@/lib/redis'

// Vercel Cron calls this every minute. We check internally whether it's time to poll.
export async function GET(req: Request) {
  // Verify this is coming from Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getSettings()
  if (!settings || !settings.active) {
    return NextResponse.json({ skipped: 'inactive' })
  }

  // Stop after session expiry
  const now = new Date()
  const expiry = new Date(settings.sessionExpiry + 'T23:59:59Z')
  if (now > expiry) {
    return NextResponse.json({ skipped: 'expired' })
  }

  // Only poll during market hours (9:30–16:00 ET, Mon–Fri)
  const etOffset = isDST(now) ? -4 : -5
  const etHour = now.getUTCHours() + etOffset
  const etMinutes = now.getUTCMinutes()
  const dayOfWeek = now.getUTCDay()
  const etTimeMinutes = (etHour < 0 ? etHour + 24 : etHour) * 60 + etMinutes
  if (dayOfWeek === 0 || dayOfWeek === 6) return NextResponse.json({ skipped: 'weekend' })
  if (etTimeMinutes < 9 * 60 + 30 || etTimeMinutes >= 16 * 60) return NextResponse.json({ skipped: 'outside_market_hours' })

  // Respect poll interval
  const lastPoll = await kv.get<string>('poll:lastAt')
  if (lastPoll) {
    const elapsed = (now.getTime() - new Date(lastPoll).getTime()) / 1000 / 60
    if (elapsed < settings.pollIntervalMinutes - 0.1) {
      return NextResponse.json({ skipped: 'interval_not_elapsed' })
    }
  }

  try {
    const provider = getProvider(settings.provider)
    const stock = await provider.getStockQuote(settings.ticker)
    const optionResults = await Promise.all(
      settings.options.map(opt => provider.getOptionQuote(settings.ticker, opt))
    )
    await ensureHeaders()
    await appendPollRow(stock, optionResults)
    await recordPollSuccess()
    return NextResponse.json({ ok: true, ticker: settings.ticker, price: stock.price })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    await recordPollError(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function isDST(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
  return date.getTimezoneOffset() < Math.max(jan, jul)
}
