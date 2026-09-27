export interface HealthData { status: 'ok'; service: string; timestamp: string }
export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError { success: false; error: { code: string; message: string } }
