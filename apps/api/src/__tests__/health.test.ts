import { describe, it, expect } from 'vitest'

describe('Health Check API', () => {
  it('should return status ok', () => {
    // Basic test to verify testing setup
    const response = { status: 'ok' }
    expect(response.status).toBe('ok')
  })
})
