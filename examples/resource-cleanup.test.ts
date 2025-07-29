/**
 * Example demonstrating the new resource cleanup functionality
 */
import Debug from 'debug'

import { CamundaAssert, setupCamundaProcessTest } from '../source'

const setup = setupCamundaProcessTest()
const log = Debug('resource-cleanup.test')
log.enabled = true

describe('Resource Cleanup Example', () => {
	test('should automatically clean up tracked resources in REMOTE mode', async () => {
		const context = setup.getContext()

		// Check the current runtime mode
		const runtimeMode = context.getRuntimeMode()
		log(`Running in ${runtimeMode} mode`)

		// Deploy multiple resources with auto-deletion enabled
		// This will automatically delete resources after the test in REMOTE mode only
		await context.deployResources(
			[
				'./examples/resources/simple-process.bpmn',
				// Add more resources here as needed
			],
			{ autoDelete: true }
		)

		// Start a process instance using context (automatically tracked for cleanup)
		const processInstance = await context.createProcessInstance({
			processDefinitionId: 'simple-process',
			variables: { testData: 'cleanup-example' },
		})

		// Verify the process instance was created
		expect(processInstance.processInstanceKey).toBeDefined()
		log(`Process instance created: ${processInstance.processInstanceKey}`)

		// Handle any job workers if needed
		await context
			.mockJobWorker('process-data')
			.thenComplete({ result: 'completed' })

		// Wait for process completion
		const assertion = CamundaAssert.assertThat(processInstance)
		await assertion.isCompleted()

		log('Process completed successfully')
		// Note: Resource cleanup happens automatically in cleanupTestData()
		// which is called by the test framework after each test
	})

	test('should handle multiple resource types', async () => {
		const context = setup.getContext()

		// Deploy multiple types of resources in one call
		await context.deployResources(
			['./examples/resources/simple-process.bpmn'],
			{ autoDelete: true }
		)

		log('Multiple resources deployed successfully')
	})

	test('should fail if process definition is not found', async () => {
		const context = setup.getContext()

		// Attempt to start a process instance that does not exist
		await expect(
			context.createProcessInstance({
				processDefinitionId: 'simple-process',
				variables: { input: 'test-data' },
			})
		).rejects.toThrow('Response code 404')
		log('Correctly failed to start non-existent process')
	})
})
