import { useEffect, useState } from 'react'
import { getHealth } from './services/api'
import type { HealthData } from './types/api'

function App() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    getHealth()
      .then((response) => { if (isActive) setHealth(response.data) })
      .catch((requestError: unknown) => {
        if (isActive) setError(requestError instanceof Error ? requestError.message : 'Unable to reach the backend.')
      })
    return () => { isActive = false }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">LearnLoop</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Development connectivity check</h1>
        <p className="mt-3 text-slate-600">This temporary page verifies the frontend-to-backend API connection.</p>
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          {health && <p className="text-emerald-700">Backend status: {health.status} ({health.service})</p>}
          {error && <p className="text-red-700">Backend connection error: {error}</p>}
          {!health && !error && <p className="text-slate-600">Checking backend status…</p>}
        </div>
      </section>
    </main>
  )
}

export default App
