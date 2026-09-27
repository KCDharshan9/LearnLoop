import type { ApiSuccess, HealthData } from '../types/api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'

export async function getHealth(): Promise<ApiSuccess<HealthData>> {
  const response = await fetch(`${apiBaseUrl}/health`)
  if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`)
  return response.json() as Promise<ApiSuccess<HealthData>>
}
