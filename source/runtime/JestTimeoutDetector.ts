import * as fs from 'fs'
import * as path from 'path'

import Debug from 'debug'

const debug = Debug('camunda:test:timeout')

/**
 * Detects and validates Jest timeout configuration for container-based tests.
 * Provides multi-layered detection strategy for different Jest versions.
 */
export class JestTimeoutDetector {
	private static readonly DEFAULT_MINIMUM_TIMEOUT = 300000 // 5 minutes
	private static readonly CONTAINER_STARTUP_TIME = 60000 // 60 seconds
	private static readonly IMAGE_DOWNLOAD_TIME = 120000 // 2 minutes for first pull
	private static readonly SYSTEM_BUFFER = 30000 // 30 second safety margin

	/**
	 * Detects the current Jest timeout using multiple strategies.
	 */
	static async detectJestTimeout(): Promise<number> {
		debug('🔍 Detecting Jest timeout...')

		// Strategy 1: Jest 27+ API
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const jestGlobal = (global as any).jest
			if (jestGlobal && typeof jestGlobal.getTimeout === 'function') {
				const timeout = jestGlobal.getTimeout()
				debug('✅ Detected timeout via jest.getTimeout(): %dms', timeout)
				return timeout
			}
		} catch (error) {
			debug('⚠️ jest.getTimeout() not available: %s', error)
		}

		// Strategy 2: Jasmine global (older Jest versions)
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const jasmine = (global as any).jasmine
			if (jasmine && jasmine.DEFAULT_TIMEOUT_INTERVAL) {
				const timeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
				debug(
					'✅ Detected timeout via jasmine.DEFAULT_TIMEOUT_INTERVAL: %dms',
					timeout
				)
				return timeout
			}
		} catch (error) {
			debug('⚠️ jasmine.DEFAULT_TIMEOUT_INTERVAL not available: %s', error)
		}

		// Strategy 3: Parse jest.config.js
		try {
			const configTimeout = await this.parseJestConfig()
			if (configTimeout > 0) {
				debug('✅ Detected timeout via jest.config.js: %dms', configTimeout)
				return configTimeout
			}
		} catch (error) {
			debug('⚠️ Failed to parse jest.config.js: %s', error)
		}

		// Strategy 4: Check environment variables
		const envTimeout = this.checkEnvironmentTimeout()
		if (envTimeout > 0) {
			debug('✅ Detected timeout via environment: %dms', envTimeout)
			return envTimeout
		}

		// Fallback: Use conservative default
		debug(
			'⚠️ Could not detect Jest timeout, using default: %dms',
			this.DEFAULT_MINIMUM_TIMEOUT
		)
		return this.DEFAULT_MINIMUM_TIMEOUT
	}

	/**
	 * Calculates the minimum required timeout for container operations.
	 */
	static calculateRequiredTimeout(): number {
		const isFirstRun = !this.isDockerImageCached()
		const baseTime = this.CONTAINER_STARTUP_TIME + this.SYSTEM_BUFFER
		const downloadTime = isFirstRun ? this.IMAGE_DOWNLOAD_TIME : 0

		const required = baseTime + downloadTime
		debug(
			'📊 Required timeout: %dms (startup: %dms, download: %dms, buffer: %dms)',
			required,
			this.CONTAINER_STARTUP_TIME,
			downloadTime,
			this.SYSTEM_BUFFER
		)

		return required
	}

	/**
	 * Validates that the current Jest timeout is sufficient for container operations.
	 * Note: Jest uses global timeout for beforeAll hooks, not individual test timeouts.
	 */
	static async validateJestTimeout(): Promise<void> {
		const jestTimeout = await this.detectJestTimeout()
		const requiredTimeout = this.calculateRequiredTimeout()

		debug(
			'🔍 Validating timeouts: Jest=%dms, Required=%dms',
			jestTimeout,
			requiredTimeout
		)

		if (jestTimeout < requiredTimeout) {
			const errorMessage = this.buildTimeoutErrorMessage(
				jestTimeout,
				requiredTimeout
			)
			console.warn('⚠️ Jest Timeout Warning:')
			console.warn(errorMessage)
			console.warn(
				'\n💡 Container startup will proceed, but may timeout during runtime initialization.'
			)
			console.warn(
				'📝 Consider updating your Jest configuration for more reliable tests.'
			)
			
			// Don't throw error - just warn. Let the user decide.
			// The actual container startup will fail with a more specific error if needed.
		}

		debug('✅ Jest timeout validation complete')
	}

	/**
	 * Checks if we're running in a Jest environment.
	 */
	static isJestEnvironment(): boolean {
		return (
			process.env.JEST_WORKER_ID !== undefined ||
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(global as any).expect !== undefined ||
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(global as any).jest !== undefined
		)
	}

	private static async parseJestConfig(): Promise<number> {
		const configPath = path.join(process.cwd(), 'jest.config.js')
		
		if (!fs.existsSync(configPath)) {
			debug('📄 jest.config.js not found at: %s', configPath)
			return 0
		}

		try {
			// Clear require cache to get fresh config
			delete require.cache[require.resolve(configPath)]
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const config = require(configPath)
			
			// Handle both direct export and module.exports
			const jestConfig = typeof config === 'function' ? config() : config
			
			if (jestConfig.testTimeout) {
				return jestConfig.testTimeout
			}

			// Check for CI-specific timeout
			if (process.env.CI && jestConfig.testTimeout) {
				return jestConfig.testTimeout
			}

			debug('📄 No testTimeout found in jest.config.js')
			return 0
		} catch (error) {
			debug('❌ Error parsing jest.config.js: %s', error)
			return 0
		}
	}

	private static checkEnvironmentTimeout(): number {
		// Check for common timeout environment variables
		const envVars = ['JEST_TIMEOUT', 'TEST_TIMEOUT', 'CAMUNDA_TEST_TIMEOUT']

		for (const envVar of envVars) {
			const value = process.env[envVar]
			if (value) {
				const timeout = parseInt(value, 10)
				if (!isNaN(timeout) && timeout > 0) {
					return timeout
				}
			}
		}

		return 0
	}

	private static isDockerImageCached(): boolean {
		// Simple heuristic: check if this is the first run
		// In a real implementation, this could check Docker for cached images
		const isCI = process.env.CI === 'true'
		const debugMode = process.env.DEBUG?.includes('camunda')
		
		// Assume images aren't cached in CI or debug mode (conservative)
		return !isCI && !debugMode
	}

	private static buildTimeoutErrorMessage(
		currentTimeout: number,
		requiredTimeout: number
	): string {
		const timeoutSeconds = Math.ceil(requiredTimeout / 1000)
		const isFirstRun = !this.isDockerImageCached()
		
		let message = `❌ Jest timeout (${currentTimeout}ms) is insufficient for container startup.\n\n`
		
		message += `🔧 Required minimum timeout: ${requiredTimeout}ms (${timeoutSeconds} seconds)\n\n`
		
		if (isFirstRun) {
			message += `📥 First run detected - Docker image download may take additional time.\n\n`
		}
		
		message += `💡 To fix this, choose one of these options:\n\n`
		message += `   1. Set test timeout in your test:\n`
		message += `      test('your test', async () => { ... }, ${requiredTimeout})\n\n`
		message += `   2. Update jest.config.js:\n`
		message += `      module.exports = { testTimeout: ${requiredTimeout} }\n\n`
		message += `   3. Set environment variable:\n`
		message += `      export JEST_TIMEOUT=${requiredTimeout}\n\n`
		message += `   4. Use CLI flag:\n`
		message += `      npm test -- --testTimeout=${requiredTimeout}\n\n`
		message += `ℹ️  For REMOTE runtime mode, timeouts can be much lower (30-60 seconds).`
		
		return message
	}
}
