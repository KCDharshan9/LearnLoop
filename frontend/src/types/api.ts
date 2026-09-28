export interface HealthData {
  status: 'ok'
  service: string
  database: 'connected' | 'disconnected'
  timestamp: string
}

export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError { success: false; error: { code: string; message: string } }

