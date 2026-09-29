/**
 * Practice API service.
 */

import type { ApiError, ApiSuccess } from '../types/api'
import type { PracticeAnswerResult, StartPracticeResult } from '../types/practice'
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

/**
 * Starts or resumes an adaptive practice session.
 */
export async function startPractice(
  learningPathId?: string,
  stepNumber?: number,
  skillId?: string,
): Promise<StartPracticeResult> {
  const response = await fetch(`${API_BASE}/practice/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ learningPathId, stepNumber, skillId }),
  })

  const json = (await response.json()) as ApiSuccess<StartPracticeResult> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}

/**
 * Submits an answer to the current practice question.
 */
export async function submitPracticeAnswer(
  sessionId: string,
  questionId: string,
  answer: unknown,
  hintUsed = false,
): Promise<PracticeAnswerResult> {
  const response = await fetch(`${API_BASE}/practice/${encodeURIComponent(sessionId)}/answer`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ questionId, answer, hintUsed }),
  })

  const json = (await response.json()) as ApiSuccess<PracticeAnswerResult> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}

/**
 * Retrieves existing session state for refresh/resume.
 */
export async function fetchPracticeSession(sessionId: string): Promise<StartPracticeResult> {
  const response = await fetch(`${API_BASE}/practice/${encodeURIComponent(sessionId)}`, {
    headers: getAuthHeaders(),
  })

  const json = (await response.json()) as ApiSuccess<StartPracticeResult> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}
