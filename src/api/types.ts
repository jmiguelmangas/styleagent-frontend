export interface ApiError {
  message: string
  status: number
}

export interface HealthResponse {
  status: 'ok'
}
