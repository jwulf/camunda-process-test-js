/**
 * Simple working example of Camunda Process Test
 */
import Debug from 'debug'

import { CamundaAssert, setupCamundaProcessTest } from '../source'

// Function approach - simpler to start with
const setup = setupCamundaProcessTest()
const log = Debug('simple.test')
log.enabled = true // Enable logging output

describe('Simple Camunda Process Test', () => {
	test('should deploy and run a simple process', async () => {
		const client = setup.getClient()
		const context = setup.getContext()
		// Deploy process
		await context.deployProcess('./examples/resources/simple-process.bpmn')

		// Start process instance
		const camunda = client.getCamundaRestClient()
		const processInstance = await camunda.createProcessInstance({
			processDefinitionId: 'simple-process',
			variables: { input: 'test-data' },
		})

		// Mock the job worker
		await context
			.mockJobWorker('process-data')
			.thenComplete({ output: 'processed-data' })

		// Basic assertion
		const assertion = CamundaAssert.assertThat(processInstance)
		await assertion.isCompleted()
	}, 180000) // 3 minute timeout for container startup
})
