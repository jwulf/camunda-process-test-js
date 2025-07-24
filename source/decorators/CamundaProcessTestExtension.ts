import { Camunda8 } from '@camunda8/sdk'
import Debug from 'debug'

import { CamundaAssert } from '../assertions/CamundaAssert'
import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'
import { CamundaProcessTestRuntime } from '../runtime/CamundaProcessTestRuntime'
import { ContainerRuntimePropertiesUtil } from '../runtime/CamundaRuntimeProperties'
import { CamundaRuntimeConfiguration } from '../types'

const debug = Debug('camunda:test:extension')
debug.enabled = true

/**
 * Extension that manages the lifecycle of Camunda process tests.
 * Handles runtime setup, client injection, and cleanup.
 */
export class CamundaProcessTestExtension {
	private runtime?: CamundaProcessTestRuntime
	private client?: Camunda8
	private context?: CamundaProcessTestContext

	async beforeAll(): Promise<void> {
		debug('🏗️ Setting up Camunda Process Test environment...')

		// Validate Jest timeout if in Jest environment and using MANAGED mode
		const runtimeConfig: CamundaRuntimeConfiguration =
			ContainerRuntimePropertiesUtil.readProperties()

		// Initialize runtime
		debug('🚀 Initializing Camunda runtime...')
		this.runtime = new CamundaProcessTestRuntime(runtimeConfig)
		await this.runtime.start()

		// Create client
		debug('🔌 Creating Zeebe client...')
		this.client = this.runtime.createClient()

		// Create context
		debug('🧪 Creating test context...')
		this.context = new CamundaProcessTestContext(this.runtime, this.client)

		// Initialize assertions
		debug('✨ Initializing assertions...')
		CamundaAssert.initialize(this.context)

		debug('✅ Camunda Process Test environment ready!')
	}

	async beforeEach(): Promise<void> {
		debug('🔄 Resetting test state...')
		if (this.context) {
			await this.context.resetTestState()
		}
		debug('✅ Test state reset complete')
	}

	async afterEach(): Promise<void> {
		debug('🧹 Cleaning up test data...')
		if (this.context) {
			await this.context.cleanupTestData()
		}
		debug('✅ Test cleanup complete')
	}

	async afterAll(): Promise<void> {
		debug('🏁 Tearing down Camunda Process Test environment...')

		// Reset assertions
		debug('🔄 Resetting assertions...')
		CamundaAssert.reset()

		// Note: Camunda8 client doesn't have a close method
		// Resources will be cleaned up when the process exits
		debug('🔌 Client cleanup (automatic)')

		// Stop runtime
		if (this.runtime) {
			debug('🛑 Stopping runtime...')
			await this.runtime.stop()
		}

		debug('✅ Camunda Process Test environment torn down successfully')
	}

	getClient(): Camunda8 {
		if (!this.client) {
			throw new Error(
				'Client not initialized. Make sure the test extension is properly set up.'
			)
		}
		return this.client
	}

	getContext(): CamundaProcessTestContext {
		if (!this.context) {
			throw new Error(
				'Context not initialized. Make sure the test extension is properly set up.'
			)
		}
		return this.context
	}
}
