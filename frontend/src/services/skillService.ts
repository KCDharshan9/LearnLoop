/**
 * Frontend Skill API service.
 */

import type { ApiError, ApiSuccess } from '../types/api'
import type { SkillDetail, SkillFilters, SkillSummary } from '../types/skills'
import { getToken } from './authService'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'

function getAuthHeaders(): HeadersInit {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function fetchSkills(filters?: SkillFilters): Promise<SkillSummary[]> {
  const params = new URLSearchParams()
  if (filters?.level !== undefined) {
    params.set('level', String(filters.level))
  }
  if (filters?.active !== undefined) {
    params.set('active', String(filters.active))
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`${API_BASE}/skills${query}`, {
    headers: getAuthHeaders(),
  })

  const json = (await response.json()) as ApiSuccess<{ skills: SkillSummary[] }> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data.skills
}

export async function fetchSkillById(skillId: string): Promise<SkillDetail> {
  const response = await fetch(`${API_BASE}/skills/${encodeURIComponent(skillId)}`, {
    headers: getAuthHeaders(),
  })

  const json = (await response.json()) as ApiSuccess<{ skill: SkillDetail }> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data.skill
}
