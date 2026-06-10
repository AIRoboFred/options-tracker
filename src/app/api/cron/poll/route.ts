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
  // Use Intl API so DST is handled correctly on Vercel's UTC servers
  if (!isMarketHours(now)) return NextResponse.json({ skipped: 'outside_market_hours' })

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

// Determine ET wall-clock time using Intl, so DST is correct regardless of
// the server's own timezone (Vercel runs in UTC).
function isMarketHours(date: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const weekday = get('weekday') // e.g. "Mon"
  let hour = parseInt(get('hour'), 10)
  if (hour === 24) hour = 0 // Intl can emit "24" at midnight
  const minute = parseInt(get('minute'), 10)

  if (weekday === 'Sat' || weekday === 'Sun') return false

  const minutesSinceMidnight = hour * 60 + minute
  const open = 9 * 60 + 30 // 9:30 AM ET
  const close = 16 * 60 // 4:00 PM ET
  return minutesSinceMidnight >= open && minutesSinceMidnight < close
}
