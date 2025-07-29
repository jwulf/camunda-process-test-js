import { Camunda8, CamundaRestClient, PollingOperation } from '@camunda8/sdk'
import Debug from 'debug'

import { CamundaClock } from './CamundaClock'
import { CamundaProcessTestRuntime } from './CamundaProcessTestRuntime'
import { JobWorkerMock } from './JobWorkerMock'

const debug = Debug('camunda:test:context')
const debugDeploy = Debug('camunda:test:deploy')
const debugWorker = Debug('camunda:test:worker')
const debugCleanup = Debug('camunda:test:cleanup')
const logCleanup = Debug('camunda:test:cleanup')
logCleanup.enabled = true
const clockWarn = Debug('camunda:test:clock')
clockWarn.enabled = true

interface TrackedResource {
	filePath: string
	key: string
	type:
		| 'process definition'
		| 'decision definition'
		| 'decisionRequirements definition'
		| 'form'
}

/**
 * Test context that provides utilities and manages test state.
 * Automatically injected into test classes decorated with @CamundaProcessTest.
 */
export class CamundaProcessTestContext {
	private currentTime: Date = new Date()
	private jobWorkers: JobWorkerMock[] = []
	private deployedProcesses: string[] = []
	private clock: CamundaClock
	private trackedResourceKeys: Set<string> = new Set()
	private trackedResources: TrackedResource[] = []
	private trackedProcessInstances: Set<string> = new Set()

	constructor(
		private runtime: CamundaProcessTestRuntime,
		protected client: Camunda8
	) {
		this.clock = new CamundaClock(runtime)
	}

	/**
	 * Gets the runtime mode for the current test environment.
	 * @returns 'MANAGED' for Docker containers, 'REMOTE' for SaaS/Cloud/self-managed
	 */
	getRuntimeMode(): 'MANAGED' | 'REMOTE' {
		return this.runtime.getRuntimeMode()
	}

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
	 * Deploys resources (BPMN processes, DMN decisions, forms) from file paths.
	 *
	 * @param resourcePaths Array of file paths to deploy
	 * @param options Optional configuration for automatic resource cleanup
	 * @returns The deployment response from Camunda
	 */
	async deployResources(
		resourcePaths: string[],
		options?: { autoDelete?: boolean }
	) {
		const shouldAutoDelete = options?.autoDelete ?? false
		debugDeploy('📋 Deploying resources: %o', resourcePaths)
		debugDeploy('�️ Auto-delete enabled: %s', shouldAutoDelete)

		const camunda = this.client.getCamundaRestClient()
		debugDeploy('🚀 Sending deployment request...')

		const response = await camunda.deployResourcesFromFiles(resourcePaths)

		// Validate deployment results
		this.validateDeploymentResponse(response, resourcePaths)

		// Track resources if auto-delete is requested
		if (shouldAutoDelete) {
			this.trackDeployedResources(response, resourcePaths)
		}

		debugDeploy('✅ Resources deployed successfully')
		return response
	}

	/**
	 * Creates and starts a process instance with automatic tracking for cleanup.
	 * Process instances are automatically cancelled in REMOTE mode during test cleanup.
	 *
	 * @param request Process instance creation request
	 * @returns The created process instance response
	 */
	async createProcessInstance(
		request: Parameters<CamundaRestClient['createProcessInstance']>[0]
	) {
		const camunda = this.client.getCamundaRestClient()
		const response = await camunda.createProcessInstance(request)

		// Track process instance for cleanup in REMOTE mode
		this.trackProcessInstance(response)

		return response
	}

	/**
	 * Creates and starts a process instance and awaits its completion with automatic tracking.
	 * Process instances are automatically cancelled in REMOTE mode during test cleanup if still running.
	 *
	 * @param request Process instance creation request with result configuration
	 * @returns The completed process instance response with variables
	 */
	async createProcessInstanceWithResult(
		request: Parameters<CamundaRestClient['createProcessInstanceWithResult']>[0]
	) {
		const camunda = this.client.getCamundaRestClient()
		const response = await camunda.createProcessInstanceWithResult(request)

		// Track process instance for cleanup in REMOTE mode (in case it's still running)
		this.trackProcessInstance(response)

		return response
	}

	private trackProcessInstance(response: { processInstanceKey?: string }) {
		if (response.processInstanceKey) {
			this.trackedProcessInstances.add(response.processInstanceKey)
			debugDeploy(
				'📝 Tracked process instance: %s',
				response.processInstanceKey
			)
		}
	}

	private validateDeploymentResponse(
		response: Awaited<
			ReturnType<CamundaRestClient['deployResourcesFromFiles']>
		>,
		resourcePaths: string[]
	): void {
		const totalDeployedResources =
			(response.processes?.length || 0) +
			(response.decisions?.length || 0) +
			(response.decisionRequirements?.length || 0) +
			(response.forms?.length || 0)

		if (totalDeployedResources === 0) {
			throw new Error('No resources were deployed from the provided files')
		}

		debugDeploy('📊 Deployment results:')
		debugDeploy('- Processes: %d', response.processes?.length || 0)
		debugDeploy('- Decisions: %d', response.decisions?.length || 0)
		debugDeploy(
			'- Decision Requirements: %d',
			response.decisionRequirements?.length || 0
		)
		debugDeploy('- Forms: %d', response.forms?.length || 0)
		debugDeploy('- Total resources deployed: %d', totalDeployedResources)
		debugDeploy('- Resource files provided: %d', resourcePaths.length)
	}

	private trackDeployedResources(
		response: Awaited<
			ReturnType<CamundaRestClient['deployResourcesFromFiles']>
		>,
		resourcePaths: string[]
	): void {
		debugDeploy('📝 Tracking deployed resources for auto-deletion...')

		// Track processes
		response.processes?.forEach(
			(
				process: { processDefinitionKey: string; resourceName: string },
				index: number
			) => {
				if (process.processDefinitionKey) {
					this.trackedResourceKeys.add(process.processDefinitionKey)
					this.trackedResources.push({
						filePath: this.inferResourcePath(resourcePaths, 'process', index),
						key: process.processDefinitionKey,
						type: 'process definition',
					})
					debugDeploy(
						'📝 Tracked process: %s (%s)',
						process.processDefinitionKey,
						process.resourceName
					)
				}
			}
		)

		// Track decisions
		response.decisions?.forEach(
			(
				decision: { decisionDefinitionKey: string; name: string },
				index: number
			) => {
				if (decision.decisionDefinitionKey) {
					this.trackedResourceKeys.add(decision.decisionDefinitionKey)
					this.trackedResources.push({
						filePath: this.inferResourcePath(resourcePaths, 'decision', index),
						key: decision.decisionDefinitionKey,
						type: 'decision definition',
					})
					debugDeploy(
						'📝 Tracked decision: %s (%s)',
						decision.decisionDefinitionKey,
						decision.name
					)
				}
			}
		)

		// Track decision requirements
		response.decisionRequirements?.forEach(
			(dr: { decisionRequirementsKey: string }, index: number) => {
				if (dr.decisionRequirementsKey) {
					this.trackedResourceKeys.add(dr.decisionRequirementsKey)
					this.trackedResources.push({
						filePath: this.inferResourcePath(
							resourcePaths,
							'decisionRequirements',
							index
						),
						key: dr.decisionRequirementsKey,
						type: 'decisionRequirements definition',
					})
					debugDeploy(
						'📝 Tracked decision requirements: %s',
						dr.decisionRequirementsKey
					)
				}
			}
		)

		// Track forms
		response.forms?.forEach((form: { formKey: string }, index: number) => {
			if (form.formKey) {
				this.trackedResourceKeys.add(form.formKey)
				this.trackedResources.push({
					filePath: this.inferResourcePath(resourcePaths, 'form', index),
					key: form.formKey,
					type: 'form',
				})
				debugDeploy('📝 Tracked form: %s', form.formKey)
			}
		})

		debugDeploy(
			'📊 Total tracked resource keys: %d',
			this.trackedResourceKeys.size
		)
		debugDeploy('📊 Total tracked resources: %d', this.trackedResources.length)
	}

	private inferResourcePath(
		resourcePaths: string[],
		resourceType: string,
		index: number
	): string {
		// Try to find a matching file extension for the resource type
		const extensions: Record<string, string[]> = {
			process: ['.bpmn'],
			decision: ['.dmn'],
			decisionRequirements: ['.dmn', '.drd'],
			form: ['.form'],
		}

		const relevantExtensions = extensions[resourceType] || []
		const matchingPaths = resourcePaths.filter((path) =>
			relevantExtensions.some((ext) => path.toLowerCase().endsWith(ext))
		)

		// Return the matching path at the given index, or fall back to the original index
		return (
			matchingPaths[index] ||
			resourcePaths[index] ||
			`unknown-${resourceType}-${index}`
		)
	}

	/**
	 * Deploys a BPMN process from a file path.
	 * @deprecated Use deployResources([resourcePath]) instead.
	 * Example: await deployResources(["path/to/process.bpmn"]);
	 */
	async deployProcess(resourcePath: string) {
		return this.deployResources([resourcePath])
	}

	/**
	 * Deploys a DMN decision from a file path.
	 * @deprecated Use deployResources()
	 */
	async deployDecision(resourcePath: string) {
		return this.deployResources([resourcePath])
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
	 *
	 * ⚠️  Warning: Time manipulation may fail in REMOTE mode (SaaS/C8Run environments).
	 * For reliable timer testing, use MANAGED mode with Docker containers.
	 */
	async increaseTime(
		duration:
			| number
			| { days?: number; hours?: number; minutes?: number; seconds?: number }
	): Promise<void> {
		const runtimeMode = this.runtime.getRuntimeMode()
		if (runtimeMode === 'REMOTE') {
			clockWarn(
				'⚠️  REMOTE mode: Time manipulation may fail on SaaS/C8Run. Consider using MANAGED mode for timer tests.'
			)
		}

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

		// Advance Zeebe's clock using the management API
		await this.clock.addTime(milliseconds)
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

		// Clear resource tracking (but don't delete resources - that's for cleanupTestData)
		this.trackedResources = []
		this.trackedResourceKeys.clear()
		this.trackedProcessInstances.clear()
	}

	/**
	 * Cleans up test data after each test method.
	 */
	async cleanupTestData(): Promise<void> {
		debug('Cleaning up test data')

		// Stop job workers first
		for (const worker of this.jobWorkers) {
			worker.stop()
		}

		// Cancel tracked process instances before deleting resources
		await this.cleanupTrackedProcessInstances()

		// Clean up tracked resources
		await this.cleanupTrackedResources()
	}

	private async cleanupTrackedProcessInstances(): Promise<void> {
		if (this.trackedProcessInstances.size === 0) {
			debugCleanup('No tracked process instances to cancel')
			return
		}

		debugCleanup(
			'🔄 Cancelling %d tracked process instances...',
			this.trackedProcessInstances.size
		)

		const camunda = this.client.getCamundaRestClient()
		const cancelErrors: string[] = []

		for (const processInstanceKey of this.trackedProcessInstances) {
			try {
				debugCleanup('⏹️ Cancelling process instance: %s', processInstanceKey)
				await camunda.cancelProcessInstance({
					processInstanceKey,
				})
				debugCleanup('✅ Cancelled process instance: %s', processInstanceKey)
			} catch (error) {
				const errorMessage = `Failed to cancel process instance ${processInstanceKey}: ${error}`
				cancelErrors.push(errorMessage)
				debugCleanup('❌ %s', errorMessage)
			}
		}

		// Clear tracking set
		this.trackedProcessInstances.clear()

		debugCleanup(
			'🔄 Process instance cancellation completed. %d errors occurred.',
			cancelErrors.length
		)

		if (cancelErrors.length > 0) {
			logCleanup('❌ Process instance cancellation errors: %o', cancelErrors)
		}
	}

	private async cleanupTrackedResources(): Promise<void> {
		if (this.trackedResources.length === 0) {
			debugCleanup('No tracked resources to clean up')
			return
		}

		debugCleanup(
			'🧹 Cleaning up %d tracked resources...',
			this.trackedResources.length
		)

		const camunda = this.client.getCamundaRestClient()
		const cleanupErrors: string[] = []

		for (const resource of this.trackedResources) {
			try {
				debugCleanup('🗑️ Deleting %s: %s', resource.type, resource.key)

				// We use a polling operation to ensure the resource is deleted
				// Until all process instances are cancelled, we cannot delete the process definition
				await PollingOperation({
					operation: () =>
						camunda
							.deleteResource({
								resourceKey: resource.key,
							})
							.then(() => true)
							.catch(() => false),
					predicate: (deleted) => deleted === true,
					interval: 500,
					timeout: 4000,
				})

				debugCleanup('✅ Deleted %s: %s', resource.type, resource.key)
			} catch (error) {
				const errorMessage = `Failed to delete ${resource.type} ${resource.key}: ${error}`
				cleanupErrors.push(errorMessage)
				debugCleanup('❌ %s', errorMessage)
			}
		}

		// Clear tracking arrays
		this.trackedResources = []
		this.trackedResourceKeys.clear()

		debugCleanup(
			'🧹 Cleanup completed. %d errors occurred.',
			cleanupErrors.length
		)

		if (cleanupErrors.length > 0) {
			logCleanup('❌ Cleanup errors: %o', cleanupErrors)
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
