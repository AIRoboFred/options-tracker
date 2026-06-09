import { kv } from '@vercel/kv'
import type { ProviderName } from './providers'

export interface OptionConfig {
  expiration: string // YYYY-MM-DD
  strike: number
  type: 'call' | 'put'
}

export interface PollSettings {
  ticker: string
  options: OptionConfig[] // exactly 9: 3 expirations × 3 options each
  pollIntervalMinutes: number
  sessionExpiry: string // YYYY-MM-DD — stop polling after this date
  provider: ProviderName
  active: boolean
}

export interface AppState {
  settings: PollSettings | null
  lastPollAt: string | null
  lastPollError: string | null
  rowsWritten: number
  googleAuthed: boolean
}

const SETTINGS_KEY = 'poll:settings'
const LAST_POLL_KEY = 'poll:lastAt'
const LAST_ERROR_KEY = 'poll:lastError'
const ROWS_KEY = 'poll:rowsWritten'

export async function getSettings(): Promise<PollSettings | null> {
  return kv.get<PollSettings>(SETTINGS_KEY)
}

export async function saveSettings(s: PollSettings): Promise<void> {
  await kv.set(SETTINGS_KEY, s)
}

export async function getAppState(): Promise<AppState> {
  const [settings, lastPollAt, lastPollError, rowsWritten, googleToken] = await Promise.all([
    kv.get<PollSettings>(SETTINGS_KEY),
    kv.get<string>(LAST_POLL_KEY),
    kv.get<string>(LAST_ERROR_KEY),
    kv.get<number>(ROWS_KEY),
    kv.get<string>('google:refresh_token'),
  ])
  return {
    settings,
    lastPollAt,
    lastPollError,
    rowsWritten: rowsWritten ?? 0,
    googleAuthed: !!googleToken,
  }
}

export async function recordPollSuccess(): Promise<void> {
  const now = new Date().toISOString()
  const rows = (await kv.get<number>(ROWS_KEY)) ?? 0
  await Promise.all([
    kv.set(LAST_POLL_KEY, now),
    kv.del(LAST_ERROR_KEY),
    kv.set(ROWS_KEY, rows + 1),
  ])
}

export async function recordPollError(msg: string): Promise<void> {
  await kv.set(LAST_ERROR_KEY, msg)
}
