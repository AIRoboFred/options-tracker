'use client'

export function StatusBadge({ active, expired }: { active: boolean; expired: boolean }) {
  if (expired) return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">Expired</span>
  if (active) return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Polling</span>
  return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Paused</span>
}
