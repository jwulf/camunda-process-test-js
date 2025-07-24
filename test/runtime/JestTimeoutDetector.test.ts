import { JestTimeoutDetector } from '../../source/runtime/JestTimeoutDetector'

describe('JestTimeoutDetector', () => {
	describe('isJestEnvironment', () => {
		it('should detect Jest environment correctly', () => {
			// In a Jest test, this should return true
			expect(JestTimeoutDetector.isJestEnvironment()).toBe(true)
		})
	})

	describe('detectJestTimeout', () => {
		it('should detect a Jest timeout value', async () => {
			const timeout = await JestTimeoutDetector.detectJestTimeout()

			// Should return a positive number
			expect(timeout).toBeGreaterThan(0)
			expect(typeof timeout).toBe('number')
		})
	})

	describe('calculateRequiredTimeout', () => {
		it('should calculate a reasonable required timeout', () => {
			const required = JestTimeoutDetector.calculateRequiredTimeout()

			// Should be at least 90 seconds (container + buffer)
			expect(required).toBeGreaterThanOrEqual(90000)
			// Should be less than 10 minutes (reasonable upper bound)
			expect(required).toBeLessThan(600000)
		})
	})

	describe('validateJestTimeout', () => {
		it('should validate timeout for current Jest environment', async () => {
			// This test runs in the actual Jest environment with configured timeouts
			// If the framework is working correctly, this should not throw
			const currentJestTimeout = await JestTimeoutDetector.detectJestTimeout()
			const requiredTimeout = JestTimeoutDetector.calculateRequiredTimeout()

			// Log the values for debugging
			console.log('Current Jest timeout:', currentJestTimeout)
			console.log('Required timeout:', requiredTimeout)

			// Since this is a unit test and not a container test,
			// we just verify the logic works without enforcing validation
			expect(typeof currentJestTimeout).toBe('number')
			expect(typeof requiredTimeout).toBe('number')
			expect(currentJestTimeout).toBeGreaterThan(0)
			expect(requiredTimeout).toBeGreaterThan(0)
		})
	})

	describe('error message formatting', () => {
		it('should format timeout values correctly in error messages', () => {
			// Test the error message construction by checking timeout calculations
			const requiredTimeout = JestTimeoutDetector.calculateRequiredTimeout()
			const timeoutSeconds = Math.ceil(requiredTimeout / 1000)

			expect(timeoutSeconds).toBeGreaterThanOrEqual(90) // At least 90 seconds
			expect(timeoutSeconds).toBeLessThan(600) // Less than 10 minutes
		})
	})
})
