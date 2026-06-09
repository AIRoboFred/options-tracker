import Link from 'next/link'
import { getAppState } from '@/lib/settings'
import { StatusBadge } from '@/components/StatusBadge'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; error?: string }>
}) {
  const params = await searchParams
  const state = await getAppState()
  const settings = state.settings
  const isExpired = settings
    ? new Date() > new Date(settings.sessionExpiry + 'T23:59:59Z')
    : false

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Options Tracker</h1>
          {settings && (
            <StatusBadge active={settings.active} expired={isExpired} />
          )}
        </div>

        {params.google === 'authed' && (
          <div className="bg-green-900/40 border border-green-700 rounded-lg p-4 text-green-300 text-sm">
            Google Sheets connected successfully.
          </div>
        )}
        {params.error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
            Error: {params.error}
          </div>
        )}

        <section className="bg-gray-900 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Google Sheets</h2>
              <p className="text-sm text-gray-400 mt-1">
                {state.googleAuthed ? 'Connected' : 'Not connected — auth required to write data'}
              </p>
            </div>
            <a
              href="/api/auth/google"
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              {state.googleAuthed ? 'Re-authenticate' : 'Connect Google'}
            </a>
          </div>
        </section>

        <section className="bg-gray-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Poll Status</h2>
            <Link
              href="/settings"
              className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              {settings ? 'Edit Settings' : 'Configure'}
            </Link>
          </div>

          {settings ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-400">Ticker</dt>
                <dd className="font-mono text-lg mt-1">{settings.ticker}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Poll interval</dt>
                <dd className="mt-1">{settings.pollIntervalMinutes} min</dd>
              </div>
              <div>
                <dt className="text-gray-400">Session expiry</dt>
                <dd className="mt-1">{settings.sessionExpiry}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Data provider</dt>
                <dd className="mt-1 capitalize">{settings.provider}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Last poll</dt>
                <dd className="mt-1">{state.lastPollAt ? new Date(state.lastPollAt).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Rows written</dt>
                <dd className="mt-1">{state.rowsWritten}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-400">No settings configured yet.</p>
          )}

          {state.lastPollError && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              Last error: {state.lastPollError}
            </div>
          )}
        </section>

        {settings?.options && settings.options.length > 0 && (
          <section className="bg-gray-900 rounded-xl p-6 space-y-3">
            <h2 className="font-semibold">Tracked Options ({settings.options.length})</h2>
            <div className="grid grid-cols-3 gap-2">
              {settings.options.map((o, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3 text-sm">
                  <div className="text-gray-400 text-xs">{o.expiration}</div>
                  <div className="font-mono mt-1">
                    ${o.strike}{' '}
                    <span className={o.type === 'call' ? 'text-green-400' : 'text-red-400'}>
                      {o.type.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
