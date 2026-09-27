/**
 * Frontend Assessment API service.
 */

import type { ApiError, ApiSuccess } from '../types/api'
import type {
  AssessmentAttemptResult,
  AssessmentData,
  SubmittedAnswer,
} from '../types/assessment'
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
 * Retrieves default diagnostic assessment metadata.
 */
export async function fetchDefaultDiagnostic(): Promise<{ id: string; title: string }> {
  const response = await fetch(`${API_BASE}/assessments/diagnostic/default`, {
    headers: getAuthHeaders(),
  })
  const json = (await response.json()) as
    | ApiSuccess<{ id: string; title: string }>
    | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}

/**
 * Gets or starts a diagnostic assessment attempt and retrieves questions.
 */
export async function startOrGetAssessment(
  assessmentId: string,
): Promise<{ attemptId: string; assessment: AssessmentData }> {
  const response = await fetch(`${API_BASE}/assessments/${encodeURIComponent(assessmentId)}`, {
    headers: getAuthHeaders(),
  })
  const json = (await response.json()) as
    | ApiSuccess<{ attemptId: string; assessment: AssessmentData }>
    | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}

/**
 * Submits an assessment attempt with student answers for server evaluation.
 */
export async function submitAssessment(
  assessmentId: string,
  answers: SubmittedAnswer[],
  attemptId?: string,
): Promise<AssessmentAttemptResult> {
  const response = await fetch(
    `${API_BASE}/assessments/${encodeURIComponent(assessmentId)}/attempts`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers, attemptId }),
    },
  )

  const json = (await response.json()) as ApiSuccess<AssessmentAttemptResult> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}

/**
 * Retrieves a completed attempt result.
 */
export async function fetchAssessmentAttempt(
  attemptId: string,
): Promise<AssessmentAttemptResult> {
  const response = await fetch(`${API_BASE}/assessment-attempts/${encodeURIComponent(attemptId)}`, {
    headers: getAuthHeaders(),
  })

  const json = (await response.json()) as ApiSuccess<AssessmentAttemptResult> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}
