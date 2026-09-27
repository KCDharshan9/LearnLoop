/**
 * Frontend Question API service.
 */

import type { ApiError, ApiSuccess } from '../types/api'
import type {
  QuestionData,
  QuestionFilters,
  SelectQuestionsOptions,
} from '../types/questions'
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

export async function fetchQuestions(filters?: QuestionFilters): Promise<QuestionData[]> {
  const params = new URLSearchParams()
  if (filters?.skill) {
    params.set('skill', filters.skill)
  }
  if (filters?.difficulty !== undefined) {
    params.set('difficulty', String(filters.difficulty))
  }
  if (filters?.type) {
    params.set('type', filters.type)
  }
  if (filters?.active !== undefined) {
    params.set('active', String(filters.active))
  }
  if (filters?.limit !== undefined) {
    params.set('limit', String(filters.limit))
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`${API_BASE}/questions${query}`, {
    headers: getAuthHeaders(),
  })

  const json = (await response.json()) as ApiSuccess<{ questions: QuestionData[] }> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data.questions
}

export async function selectQuestions(
  options: SelectQuestionsOptions,
): Promise<{ questions: QuestionData[]; count: number }> {
  const response = await fetch(`${API_BASE}/questions/select`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(options),
  })

  const json = (await response.json()) as
    | ApiSuccess<{ questions: QuestionData[]; count: number }>
    | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}
