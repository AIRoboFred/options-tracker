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

// Groups options into 3 expirations × 3 options
function groupByExpiry(options: OptionConfig[]): OptionConfig[][] {
  const groups: OptionConfig[][] = [[], [], []]
  options.forEach((o, i) => groups[Math.floor(i / 3)].push(o))
  return groups
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<PollSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [expirations, setExpirations] = useState<string[]>([])
  const [strikesByExpiry, setStrikesByExpiry] = useState<Record<string, number[]>>({})
  const [loadingChain, setLoadingChain] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { if (data) setSettings(data) })
      .catch(() => {})
  }, [])

  const loadExpirations = useCallback(async (ticker: string) => {
    if (!ticker) return
    setLoadingChain(true)
    setError(null)
    try {
      const res = await fetch(`/api/options-chain?ticker=${ticker}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExpirations(data.expirations ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expirations')
    } finally {
      setLoadingChain(false)
    }
  }, [])

  const loadStrikes = useCallback(async (ticker: string, expiration: string) => {
    if (!ticker || !expiration || strikesByExpiry[expiration]) return
    try {
      const res = await fetch(`/api/options-chain?ticker=${ticker}&expiration=${expiration}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStrikesByExpiry(prev => ({ ...prev, [expiration]: data.strikes ?? [] }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load strikes')
    }
  }, [strikesByExpiry])

  function updateOption(index: number, patch: Partial<OptionConfig>) {
    setSettings(prev => {
      const options = [...prev.options]
      options[index] = { ...options[index], ...patch }
      // When expiry changes on the first option of a group, propagate to siblings
      if ('expiration' in patch) {
        const groupStart = Math.floor(index / 3) * 3
        options[groupStart].expiration = patch.expiration!
        options[groupStart + 1].expiration = patch.expiration!
        options[groupStart + 2].expiration = patch.expiration!
        loadStrikes(prev.ticker, patch.expiration!)
      }
      return { ...prev, options }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Save failed')
      router.push('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const groups = groupByExpiry(settings.options)

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-gray-200 text-sm">← Back</a>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* General */}
        <section className="bg-gray-900 rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-lg">General</h2>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Ticker symbol</label>
              <div className="flex gap-2">
                <input
                  value={settings.ticker}
                  onChange={e => setSettings(s => ({ ...s, ticker: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SPY"
                  className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => loadExpirations(settings.ticker)}
                  disabled={!settings.ticker || loadingChain}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {loadingChain ? '…' : 'Load'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Data provider</label>
              <select
                value={settings.provider}
                onChange={e => setSettings(s => ({ ...s, provider: e.target.value as 'yahoo' }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="yahoo">Yahoo Finance (15-min delayed)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Poll interval (minutes)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.pollIntervalMinutes}
                onChange={e => setSettings(s => ({ ...s, pollIntervalMinutes: Number(e.target.value) }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500">Minimum: 1 min (Vercel Cron limit)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Session expiry date</label>
              <input
                type="date"
                value={settings.sessionExpiry}
                onChange={e => setSettings(s => ({ ...s, sessionExpiry: e.target.value }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500">Polling stops after this date</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={settings.active}
              onChange={e => setSettings(s => ({ ...s, active: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="active" className="text-sm">Polling active</label>
          </div>
        </section>

        {/* Options — 3 groups */}
        {groups.map((group, gi) => (
          <section key={gi} className="bg-gray-900 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Expiration {gi + 1}</h2>
              <select
                value={group[0].expiration}
                onChange={e => updateOption(gi * 3, { expiration: e.target.value })}
                className="bg-gray-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— select expiration —</option>
                {expirations.map(exp => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>
            </div>

            {!expirations.length && (
              <p className="text-xs text-gray-500">Enter a ticker and click Load to see expirations</p>
            )}

            <div className="space-y-3">
              {group.map((opt, oi) => {
                const globalIndex = gi * 3 + oi
                const strikes = strikesByExpiry[opt.expiration] ?? []
                return (
                  <div key={oi} className="flex gap-3 items-center">
                    <span className="text-xs text-gray-500 w-12">#{oi + 1}</span>
                    <select
                      value={opt.strike || ''}
                      onChange={e => updateOption(globalIndex, { strike: Number(e.target.value) })}
                      disabled={!opt.expiration}
                      className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">— strike —</option>
                      {strikes.map(s => (
                        <option key={s} value={s}>${s}</option>
                      ))}
                    </select>
                    <select
                      value={opt.type}
                      onChange={e => updateOption(globalIndex, { type: e.target.value as 'call' | 'put' })}
                      className="w-24 bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                    </select>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        <div className="flex gap-3 justify-end">
          <a href="/" className="px-5 py-2.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
            Cancel
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </main>
  )
}
