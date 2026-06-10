'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PollSettings, OptionConfig } from '@/lib/settings'

const EMPTY_OPTION: OptionConfig = { expiration: '', strike: 0, type: 'call' }

const DEFAULT_SETTINGS: PollSettings = {
  ticker: '',
  options: Array(9).fill(null).map(() => ({ ...EMPTY_OPTION })),
  pollIntervalMinutes: 1,
  sessionExpiry: '',
  provider: 'yahoo',
  active: true,
}

const INTERVALS = [1, 5, 10, 15, 30, 60]

function groupByExpiry(options: OptionConfig[]): OptionConfig[][] {
  const groups: OptionConfig[][] = [[], [], []]
  options.forEach((o, i) => groups[Math.floor(i / 3)].push(o))
  return groups
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<PollSettings>(DEFAULT_SETTINGS)
  const [expirations, setExpirations] = useState<string[]>([])
  const [strikesByExpiry, setStrikesByExpiry] = useState<Record<string, number[]>>({})
  const [loadingChain, setLoadingChain] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleAuthed, setGoogleAuthed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  // Load existing settings + status, and seed the dropdowns with saved values
  // so previously entered data is visible immediately (persistence).
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: PollSettings | null) => {
        if (!data) return
        setSettings(data)
        const savedExpiries = Array.from(new Set(data.options.map(o => o.expiration).filter(Boolean)))
        setExpirations(savedExpiries)
        const strikeMap: Record<string, number[]> = {}
        data.options.forEach(o => {
          if (!o.expiration || !o.strike) return
          strikeMap[o.expiration] = Array.from(new Set([...(strikeMap[o.expiration] ?? []), o.strike])).sort((a, b) => a - b)
        })
        setStrikesByExpiry(strikeMap)
      })
      .catch(() => {})

    fetch('/api/status')
      .then(r => r.json())
      .then(s => setGoogleAuthed(!!s.googleAuthed))
      .catch(() => {})
  }, [])

  const loadStrikes = useCallback(async (ticker: string, expiration: string) => {
    if (!ticker || !expiration) return
    try {
      const res = await fetch(`/api/options-chain?ticker=${ticker}&expiration=${expiration}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // merge with any saved strikes so the current selection stays valid
      setStrikesByExpiry(prev => ({
        ...prev,
        [expiration]: Array.from(new Set([...(prev[expiration] ?? []), ...(data.strikes ?? [])])).sort((a, b) => a - b),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load strikes')
    }
  }, [])

  const loadExpirations = useCallback(async (ticker: string) => {
    if (!ticker) return
    setLoadingChain(true)
    setError(null)
    try {
      const res = await fetch(`/api/options-chain?ticker=${ticker}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // merge fetched expirations with any already-selected ones
      setExpirations(prev => Array.from(new Set([...prev, ...(data.expirations ?? [])])).sort())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expirations')
    } finally {
      setLoadingChain(false)
    }
  }, [])

  function updateOption(index: number, patch: Partial<OptionConfig>) {
    setSettings(prev => {
      const options = [...prev.options]
      options[index] = { ...options[index], ...patch }
      if ('expiration' in patch) {
        const groupStart = Math.floor(index / 3) * 3
        for (let k = groupStart; k < groupStart + 3; k++) options[k] = { ...options[k], expiration: patch.expiration! }
        loadStrikes(prev.ticker, patch.expiration!)
      }
      return { ...prev, options }
    })
  }

  async function persist(active: boolean): Promise<boolean> {
    setSaving(true)
    setError(null)
    setSavedMsg(null)
    const payload = { ...settings, active }
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      setSettings(payload)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    const ok = await persist(settings.active)
    if (ok) setSavedMsg('Configuration saved.')
  }

  async function handleStartLogging() {
    const ok = await persist(true)
    if (ok) router.push('/')
  }

  const groups = groupByExpiry(settings.options)
  const intervalLabel = (m: number) => (m === 1 ? '1min' : m === 60 ? '1hr' : `${m}min`)

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      {/* Heading */}
      <div className="flex items-start gap-4">
        <div className="w-1 self-stretch rounded bg-[var(--accent-green)]" />
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">New Logging Configuration</h1>
          <p className="text-[var(--text-muted)] mt-2 max-w-2xl">
            Define global parameters and specific strike targets for real-time volatility monitoring.
            Data is harvested according to the polling frequency set below.
          </p>
        </div>
      </div>

      {error && (
        <div className="tl-panel border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}
      {savedMsg && (
        <div className="tl-panel border-[var(--accent-green)]/40 bg-[var(--accent-green)]/10 px-4 py-3 text-sm text-[var(--accent-green)]">{savedMsg}</div>
      )}

      {/* Global settings */}
      <section className="tl-panel p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[var(--accent-blue)]">⫶⫶⫶</span>
          <h2 className="text-sm font-bold tracking-widest text-[var(--accent-blue)]">GLOBAL SETTINGS</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="tl-label">Stock Ticker Symbol</label>
            <div className="flex gap-2">
              <input
                value={settings.ticker}
                onChange={e => setSettings(s => ({ ...s, ticker: e.target.value.toUpperCase() }))}
                placeholder="E.G. AAPL, TSLA"
                className="tl-input uppercase"
              />
              <button
                onClick={() => loadExpirations(settings.ticker)}
                disabled={!settings.ticker || loadingChain}
                className="shrink-0 px-4 rounded-lg bg-[var(--accent-blue)]/15 border border-[var(--accent-blue)]/40 text-[var(--accent-blue)] text-sm font-semibold hover:bg-[var(--accent-blue)]/25 disabled:opacity-40 transition"
              >
                {loadingChain ? '…' : 'Load'}
              </button>
            </div>
          </div>

          <div>
            <label className="tl-label">Polling Frequency</label>
            <select
              value={settings.pollIntervalMinutes}
              onChange={e => setSettings(s => ({ ...s, pollIntervalMinutes: Number(e.target.value) }))}
              className="tl-input"
            >
              {INTERVALS.map(m => (
                <option key={m} value={m}>{intervalLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="tl-label">Stop Logging After (session expiry)</label>
            <input
              type="date"
              value={settings.sessionExpiry}
              onChange={e => setSettings(s => ({ ...s, sessionExpiry: e.target.value }))}
              className="tl-input"
            />
            <p className="text-xs text-[var(--text-dim)] mt-1.5">Leave blank to log indefinitely during market hours.</p>
          </div>
          <div>
            <label className="tl-label">Google Sheets</label>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${googleAuthed ? 'text-[var(--accent-green)]' : 'text-[var(--text-dim)]'}`}>
                {googleAuthed ? '● Connected' : '○ Not connected'}
              </span>
              <a
                href="/api/auth/google"
                className="px-3 py-1.5 rounded-lg bg-[var(--panel-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition"
              >
                {googleAuthed ? 'Re-authenticate' : 'Connect'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Expiry cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {groups.map((group, gi) => (
          <section key={gi} className="tl-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest text-[var(--text-muted)] bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2.5 py-1">
                EXPIRY {gi + 1}
              </span>
              <span className="text-[var(--text-dim)]">🕒</span>
            </div>

            <label className="tl-label">Expiry Date</label>
            <select
              value={group[0].expiration}
              onChange={e => updateOption(gi * 3, { expiration: e.target.value })}
              className="tl-input mb-4"
            >
              <option value="">— select —</option>
              {expirations.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>

            <div className="space-y-4">
              {group.map((opt, oi) => {
                const globalIndex = gi * 3 + oi
                const strikes = strikesByExpiry[opt.expiration] ?? []
                return (
                  <div key={oi} className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel-2)] p-3">
                    <div className="text-[0.7rem] font-semibold text-[var(--text-dim)] mb-2">CONTRACT {oi + 1}</div>

                    {/* CALL / PUT toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {(['call', 'put'] as const).map(t => {
                        const on = opt.type === t
                        return (
                          <button
                            key={t}
                            onClick={() => updateOption(globalIndex, { type: t })}
                            className={`py-2 rounded-md text-xs font-bold tracking-wide transition border ${
                              on
                                ? 'bg-[var(--accent-blue)] text-[#04121e] border-[var(--accent-blue)]'
                                : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent-blue)]/50'
                            }`}
                          >
                            {t.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>

                    <label className="tl-label !mb-1.5 !text-xs">Strike Price</label>
                    <select
                      value={opt.strike || ''}
                      onChange={e => updateOption(globalIndex, { strike: Number(e.target.value) })}
                      disabled={!opt.expiration}
                      className="tl-input disabled:opacity-40 !py-2"
                    >
                      <option value="">$0.00</option>
                      {strikes.map(s => (
                        <option key={s} value={s}>${s}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Action bar */}
      <section className="tl-panel p-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="text-[var(--accent-green)]">ⓘ</span>
          Logs every <span className="text-[var(--text)] font-semibold">{intervalLabel(settings.pollIntervalMinutes)}</span> during market hours (9:30–16:00 ET). Connection status:{' '}
          <span className="text-[var(--accent-green)]">{googleAuthed ? 'Stable' : 'Auth required'}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-3 rounded-lg bg-[var(--panel-2)] border border-[var(--border)] text-sm font-semibold hover:border-[var(--text-dim)] disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
          <button
            onClick={handleStartLogging}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-[var(--accent-green)] text-[#062017] text-sm font-bold hover:brightness-110 disabled:opacity-50 transition flex items-center gap-2"
          >
            ▶ Start Logging
          </button>
        </div>
      </section>

      {/* Stats footer */}
      <section className="tl-panel p-5 flex items-center gap-10">
        <div>
          <div className="text-xs tracking-widest text-[var(--text-dim)] font-semibold">CONTRACTS</div>
          <div className="text-3xl font-extrabold font-mono mt-1">
            {String(settings.options.filter(o => o.strike && o.expiration).length).padStart(2, '0')}
          </div>
        </div>
        <div className="h-10 w-px bg-[var(--border)]" />
        <div>
          <div className="text-xs tracking-widest text-[var(--text-dim)] font-semibold">EXPIRIES</div>
          <div className="text-3xl font-extrabold font-mono mt-1 text-[var(--accent-blue)]">
            {String(new Set(settings.options.map(o => o.expiration).filter(Boolean)).size).padStart(2, '0')}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs tracking-widest text-[var(--text-dim)] font-semibold">STATUS</div>
          <div className={`text-lg font-bold mt-1 ${settings.active ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>
            {settings.active ? 'ACTIVE' : 'PAUSED'}
          </div>
        </div>
      </section>
    </div>
  )
}
