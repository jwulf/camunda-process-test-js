/**
 * Example showing how to run tests with verbose debugging information
 *
 * This test demonstrates all the debug information available when running
 * Camunda Process Tests with debugging enabled.
 */

import { CamundaAssert, setupCamundaProcessTest } from '../source'

// Function approach with debugging
const setup = setupCamundaProcessTest()

describe('Camunda Process Test - Debug Mode', () => {
	test('should show verbose debug information during test execution', async () => {
		const client = setup.getClient()
		const context = setup.getContext()

		// Deploy process - watch for deployment debug info
		await context.deployProcess('./examples/resources/simple-process.bpmn')

		// Start process instance - watch for client debug info
		const camunda = client.getCamundaRestClient()
		const processInstance = await camunda.createProcessInstance({
			processDefinitionId: 'simple-process',
			variables: { input: 'debug-test-data', debugMode: true },
		})

		// Create job worker - watch for worker debug info
		await context.mockJobWorker('process-data').thenComplete({
			output: 'processed-in-debug-mode',
			timestamp: new Date().toISOString(),
			debugInfo: 'Successfully processed with debugging enabled',
		})

		// Basic assertion - watch for assertion debug info
		const assertion = CamundaAssert.assertThat(processInstance)
		await assertion.isCompleted()

		console.log(
			'🎉 Test completed! Check the debug output above for detailed information.'
		)
	}, 180000) // Extended timeout for first-time container pulls
})

/* 
🐛 DEBUG MODE INSTRUCTIONS:

To run this test with full debugging information, use:

1. Enable all debug output:
   DEBUG=camunda:* npm test examples/debug.test.ts

2. Enable specific debug categories:
   DEBUG=camunda:test:container npm test examples/debug.test.ts
   DEBUG=camunda:test:runtime npm test examples/debug.test.ts
   DEBUG=camunda:test:deploy npm test examples/debug.test.ts
   DEBUG=camunda:test:worker npm test examples/debug.test.ts
   DEBUG=camunda:test:logs npm test examples/debug.test.ts

3. Enable Docker and container debugging:
   DEBUG=camunda:test:docker,camunda:test:container npm test examples/debug.test.ts

4. Full verbose mode with timestamps:
   DEBUG=camunda:* npm test examples/debug.test.ts 2>&1 | ts '[%Y-%m-%d %H:%M:%S]'

📊 DEBUG CATEGORIES:
- camunda:test:runtime    - Runtime lifecycle (start/stop)
- camunda:test:container  - Container operations (pull/start/stop)
- camunda:test:docker     - Docker image information
- camunda:test:extension  - Test extension lifecycle
- camunda:test:context    - Test context operations
- camunda:test:deploy     - Process/decision deployments
- camunda:test:worker     - Job worker operations
- camunda:test:logs       - Container log capture and storage

🔍 WHAT YOU'LL SEE:
- Container startup sequence with timings
- Docker image pulls and container IDs
- Process deployment details with keys and versions
- Job worker creation and configuration
- Test lifecycle hooks (beforeAll, beforeEach, etc.)
- Client connection information
- Assertion execution details
- Container log capture (saved to ./camunda-test-logs/)

📋 CONTAINER LOGS:
When debug mode is enabled, container logs are automatically captured to:
- ./camunda-test-logs/elasticsearch-{timestamp}.log
- ./camunda-test-logs/camunda-{timestamp}.log  
- ./camunda-test-logs/connectors-{timestamp}.log (if connectors enabled)

💡 TIP: The first run takes longer due to Docker image downloads.
Subsequent runs will be much faster as images are cached.
*/
