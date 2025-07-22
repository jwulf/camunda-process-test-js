import { Camunda8 } from '@camunda8/sdk'
import Debug from 'debug'

import { CamundaProcessTestRuntime } from './CamundaProcessTestRuntime'
import { JobWorkerMock } from './JobWorkerMock'

const debug = Debug('camunda:test:context')
const debugDeploy = Debug('camunda:test:deploy')
const debugWorker = Debug('camunda:test:worker')

/**
 * Test context that provides utilities and manages test state.
 * Automatically injected into test classes decorated with @CamundaProcessTest.
 */
export class CamundaProcessTestContext {
	private currentTime: Date = new Date()
	private jobWorkers: JobWorkerMock[] = []
	private deployedProcesses: string[] = []

	constructor(
		private runtime: CamundaProcessTestRuntime,
		protected client: Camunda8
	) {}

	/**
	 * Gets the Zeebe client for interacting with the process engine.
	 */
	getClient(): Camunda8 {
		return this.client
	}

	/**
	 * Gets the gateway address for the Camunda runtime.
	 */
	getGatewayAddress(): string {
		return this.runtime.getGatewayAddress()
	}

	/**
	 * Gets the connectors address if connectors are enabled.
	 */
	getConnectorsAddress(): string | undefined {
		return this.runtime.getConnectorsAddress()
	}

	/**
	 * Deploys a BPMN process from a file path.
	 */
	async deployProcess(resourcePath: string, processId?: string): Promise<void> {
		debugDeploy('📋 Deploying BPMN process from: %s', resourcePath)

		const camunda = this.client.getCamundaRestClient()
		debugDeploy('🚀 Sending deployment request...')

		const response = await camunda.deployResourcesFromFiles([resourcePath])

		if (processId) {
			this.deployedProcesses.push(processId)
			debugDeploy('📝 Tracking process ID: %s', processId)
		}

		// TODO: Should we throw if no process is deployed?
		// TODO: Do we allow multiple processes to be deployed at once?
		const deployment = response.processes[0] ?? {}
		debugDeploy('✅ Process deployed successfully')
		debugDeploy(
			'📍 Process Definition Key: %s',
			deployment.processDefinitionKey
		)
		debugDeploy('📍 Process Definition Id: %s', deployment.processDefinitionId)
		debugDeploy('📍 Version: %d', deployment.processDefinitionVersion)
		debugDeploy('📍 Resource Name: %s', deployment.resourceName)
	}

	/**
	 * Deploys a DMN decision from a file path.
	 */
	async deployDecision(resourcePath: string): Promise<void> {
		debugDeploy('📊 Deploying DMN decision from: %s', resourcePath)

		const camunda = this.client.getCamundaRestClient()
		debugDeploy('🚀 Sending decision deployment request...')

		const response = await camunda.deployResourcesFromFiles([resourcePath])

		const deployment = response.decisions[0] ?? {}
		debugDeploy('✅ Decision deployed successfully')
		debugDeploy('📍 Decision Key: %s', deployment.decisionKey)
		debugDeploy('📍 Decision ID: %s', deployment.decisionDefinitionId)
		debugDeploy('📍 Decision Name: %s', deployment.name)
		debugDeploy('📍 Version: %d', deployment.version)
	}

	/**
	 * Creates a mock job worker that can be configured to handle jobs in tests.
	 */
	mockJobWorker(jobType: string): JobWorkerMock {
		debugWorker('🔧 Creating job worker for type: %s', jobType)
		const worker = new JobWorkerMock(this.client, jobType)
		this.jobWorkers.push(worker)
		debugWorker(
			'📝 Worker registered (total workers: %d)',
			this.jobWorkers.length
		)
		return worker
	}

	/**
	 * Increases the current time by the specified duration.
	 * This affects timers and scheduled tasks in processes.
	 */
	increaseTime(
		duration:
			| number
			| { days?: number; hours?: number; minutes?: number; seconds?: number }
	): void {
		let milliseconds: number

		if (typeof duration === 'number') {
			milliseconds = duration
		} else {
			milliseconds =
				(duration.days || 0) * 24 * 60 * 60 * 1000 +
				(duration.hours || 0) * 60 * 60 * 1000 +
				(duration.minutes || 0) * 60 * 1000 +
				(duration.seconds || 0) * 1000
		}

		this.currentTime = new Date(this.currentTime.getTime() + milliseconds)
		debug(
			`Time increased by ${milliseconds}ms to ${this.currentTime.toISOString()}`
		)

		// TODO: Implement actual time manipulation in Zeebe
		// This would require custom clock manipulation or test time API
	}

	/**
	 * Gets the current test time.
	 */
	getCurrentTime(): Date {
		return new Date(this.currentTime)
	}

	/**
	 * Resets the test time to the current system time.
	 */
	resetTime(): void {
		this.currentTime = new Date()
		debug(`Time reset to ${this.currentTime.toISOString()}`)
	}

	/**
	 * Waits for a condition to be met with polling.
	 */
	async waitUntil(
		condition: () => Promise<boolean> | boolean,
		options: { timeout?: number; interval?: number } = {}
	): Promise<void> {
		const timeout = options.timeout || 10000
		const interval = options.interval || 100
		const startTime = Date.now()

		while (Date.now() - startTime < timeout) {
			if (await condition()) {
				return
			}
			await this.sleep(interval)
		}

		throw new Error(`Condition not met within ${timeout}ms`)
	}

	/**
	 * Resets test state between test methods.
	 */
	async resetTestState(): Promise<void> {
		debug('Resetting test state')
		this.resetTime()

		// Stop all job workers
		for (const worker of this.jobWorkers) {
			worker.stop()
		}
		this.jobWorkers = []
	}

	/**
	 * Cleans up test data after each test method.
	 */
	async cleanupTestData(): Promise<void> {
		debug('Cleaning up test data')

		// In a real implementation, this would:
		// - Cancel running process instances
		// - Clear job workers
		// - Reset Zeebe state
		// For now, we just stop job workers
		for (const worker of this.jobWorkers) {
			worker.stop()
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
