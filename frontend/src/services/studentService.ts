/**
 * Frontend Student Profile & Progress API service.
 */

import type { ApiError, ApiSuccess } from '../types/api'
import type { LearnerProfileResponse, LearnerProgressResponse } from '../types/student'
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
 * Retrieves learner profile including current competency snapshot and summary.
 * GET /api/students/:studentId
 */
export async function fetchStudentProfile(studentId: string): Promise<LearnerProfileResponse> {
  const response = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}`, {
    headers: getAuthHeaders(),
  })
  const json = (await response.json()) as ApiSuccess<LearnerProfileResponse> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}

/**
 * Retrieves historical progress timeline for a student.
 * GET /api/students/:studentId/progress
 */
export async function fetchStudentProgress(studentId: string): Promise<LearnerProgressResponse> {
  const response = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/progress`, {
    headers: getAuthHeaders(),
  })
  const json = (await response.json()) as ApiSuccess<LearnerProgressResponse> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}
