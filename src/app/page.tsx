import Link from 'next/link'
import { getAppState } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; error?: string }>
}) {
  const params = await searchParams
  const state = await getAppState()
  const settings = state.settings
  const isExpired = settings?.sessionExpiry
    ? new Date() > new Date(settings.sessionExpiry + 'T23:59:59Z')
    : false

  const statusLabel = !settings
    ? 'NOT CONFIGURED'
    : isExpired
      ? 'EXPIRED'
      : settings.active
        ? 'LOGGING'
        : 'PAUSED'
  const statusColor = statusLabel === 'LOGGING'
    ? 'text-[var(--accent-green)]'
    : statusLabel === 'EXPIRED'
      ? 'text-[var(--text-dim)]'
      : 'text-[var(--accent-blue)]'

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      <div className="flex items-start gap-4">
        <div className="w-1 self-stretch rounded bg-[var(--accent-green)]" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight">Dashboard</h1>
            <Link
              href="/settings"
              className="px-5 py-2.5 rounded-lg bg-[var(--accent-green)] text-[#062017] text-sm font-bold hover:brightness-110 transition"
            >
              {settings ? 'Edit Configuration' : 'Configure'}
            </Link>
          </div>
          <p className="text-[var(--text-muted)] mt-2">Live status of your options logging session.</p>
        </div>
      </div>

      {params.google === 'authed' && (
        <div className="tl-panel border-[var(--accent-green)]/40 bg-[var(--accent-green)]/10 px-4 py-3 text-sm text-[var(--accent-green)]">
          Google Sheets connected successfully.
        </div>
      )}
      {params.error && (
        <div className="tl-panel border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error: {params.error}
        </div>
      )}

      {/* Status tiles */}
      <div className="grid md:grid-cols-4 gap-5">
        <Tile label="STATUS" value={statusLabel} valueClass={statusColor} />
        <Tile label="TICKER" value={settings?.ticker || '—'} mono />
        <Tile label="INTERVAL" value={settings ? `${settings.pollIntervalMinutes}min` : '—'} mono />
        <Tile label="ROWS WRITTEN" value={String(state.rowsWritten)} mono valueClass="text-[var(--accent-blue)]" />
      </div>

      {/* Detail */}
      <section className="tl-panel p-6">
        <h2 className="text-sm font-bold tracking-widest text-[var(--accent-blue)] mb-5">SESSION</h2>
        {settings ? (
          <dl className="grid md:grid-cols-3 gap-6 text-sm">
            <Detail label="Data provider" value={settings.provider} />
            <Detail label="Session expiry" value={settings.sessionExpiry || 'Indefinite'} />
            <Detail label="Last poll" value={state.lastPollAt ? new Date(state.lastPollAt).toLocaleString() : '—'} />
            <Detail
              label="Google Sheets"
              value={state.googleAuthed ? 'Connected' : 'Not connected'}
              valueClass={state.googleAuthed ? 'text-[var(--accent-green)]' : 'text-[var(--text-dim)]'}
            />
            <Detail label="Tracked contracts" value={String(settings.options.filter(o => o.strike && o.expiration).length)} />
            <Detail label="Expiries" value={String(new Set(settings.options.map(o => o.expiration).filter(Boolean)).size)} />
          </dl>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No configuration yet. Click Configure to get started.</p>
        )}

        {state.lastPollError && (
          <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Last error: {state.lastPollError}
          </div>
        )}
      </section>

      {/* Tracked options */}
      {settings?.options?.some(o => o.strike) && (
        <section className="tl-panel p-6">
          <h2 className="text-sm font-bold tracking-widest text-[var(--accent-blue)] mb-5">
            TRACKED CONTRACTS
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {settings.options.map((o, i) => (
              <div key={i} className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel-2)] p-3 flex items-center justify-between">
                <span className="font-mono text-sm">
                  ${o.strike || '—'}{' '}
                  <span className={o.type === 'call' ? 'text-[var(--accent-green)]' : 'text-red-400'}>
                    {o.type.toUpperCase()}
                  </span>
                </span>
                <span className="text-xs text-[var(--text-dim)] font-mono">{o.expiration || '—'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Tile({ label, value, mono, valueClass = '' }: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  return (
    <div className="tl-panel p-5">
      <div className="text-xs tracking-widest text-[var(--text-dim)] font-semibold">{label}</div>
      <div className={`text-2xl font-extrabold mt-2 ${mono ? 'font-mono' : ''} ${valueClass}`}>{value}</div>
    </div>
  )
}

function Detail({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <dt className="text-[var(--text-dim)] text-xs">{label}</dt>
      <dd className={`mt-1 capitalize ${valueClass}`}>{value}</dd>
    </div>
  )
}
