'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sidebarItems = [
  { label: 'Market', href: '/', icon: '📈' },
  { label: 'Positions', href: '/', icon: '🗂' },
  { label: 'Orders', href: '/', icon: '🧾' },
  { label: 'Logs', href: '/settings', icon: '📝' },
  { label: 'Research', href: '/', icon: '🔎' },
]

const topItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Watchlist', href: '/' },
  { label: 'Analytics', href: '/' },
  { label: 'History', href: '/settings' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col">
        <div className="px-6 py-6">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-[var(--accent-green)]">
            TradeLog <span className="text-[var(--text)]">Pro</span>
          </Link>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--accent-blue)]/20 border border-[var(--accent-blue)]/40 grid place-items-center text-sm font-bold text-[var(--accent-blue)]">
              AT
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Alpha Trader</div>
              <div className="text-xs text-[var(--text-dim)]">Pro Account</div>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4">
          <Link
            href="/settings"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--accent-green)] hover:brightness-110 transition text-[#062017] font-semibold py-2.5 text-sm"
          >
            + New Trade
          </Link>
        </div>

        <nav className="px-3 mt-8 space-y-1">
          {sidebarItems.map((item, i) => {
            const active = item.href === '/settings' && pathname === '/settings'
            return (
              <Link
                key={i}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30'
                    : 'text-[var(--text-muted)] hover:bg-white/5'
                }`}
              >
                <span className="opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-4 py-5 border-t border-[var(--border-soft)]">
          <span className="text-sm text-[var(--text-dim)]">＠ Support</span>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center px-6 gap-8">
          <nav className="flex items-center gap-7">
            {topItems.map((item, i) => {
              const active =
                (item.label === 'History' && pathname === '/settings') ||
                (item.label === 'Dashboard' && pathname === '/')
              return (
                <Link
                  key={i}
                  href={item.href}
                  className={`text-sm pb-1 border-b-2 transition ${
                    active
                      ? 'text-[var(--text)] border-[var(--accent-green)]'
                      : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:block w-72 rounded-lg bg-[var(--panel-2)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-dim)]">
              Search markets…
            </div>
            <span className="text-[var(--text-muted)]">🔔</span>
            <span className="text-[var(--text-muted)]">⚙️</span>
            <div className="h-8 w-8 rounded-full bg-[var(--accent-blue)]/30 border border-[var(--accent-blue)]/40" />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  )
}
