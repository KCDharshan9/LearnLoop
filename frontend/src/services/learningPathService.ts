/**
 * Learning Path API service.
 */

import type { ApiError, ApiSuccess } from '../types/api'
import type { LearningPathData, LearningPathResponse } from '../types/learningPath'
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
 * Retrieves or generates the current learning path for a student.
 */
export async function fetchStudentLearningPath(studentId: string): Promise<LearningPathResponse> {
  const response = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/learning-path`, {
    headers: getAuthHeaders(),
  })

  const json = (await response.json()) as ApiSuccess<LearningPathResponse> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}

/**
 * Completes a specific step in the learning path.
 */
export async function completeLearningPathStep(
  learningPathId: string,
  stepNumber: number,
): Promise<LearningPathData> {
  const response = await fetch(
    `${API_BASE}/learning-paths/${encodeURIComponent(learningPathId)}/steps/${stepNumber}/complete`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
  )

  const json = (await response.json()) as ApiSuccess<LearningPathData> | ApiError

  if (!response.ok || !json.success) {
    const errorMsg = 'error' in json ? json.error.message : `HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return json.data
}
