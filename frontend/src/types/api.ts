export interface HealthData { status: 'ok'; service: string; timestamp: string }
export interface ApiSuccess<T> { success: true; data: T }
