/**
 * Test to demonstrate Jest timeout validation in action
 */
import Debug from 'debug'

import { setupCamundaProcessTest } from '../source'

// This test intentionally has a low timeout to demonstrate the validation
const setup = setupCamundaProcessTest()
const log = Debug('timeout-validation.test')
log.enabled = true

describe('Jest Timeout Validation Demo', () => {
	test('should fail with helpful error message when timeout is too low', async () => {
		// This test will fail during beforeAll with a helpful timeout error
		// because the test timeout (5 seconds) is insufficient for container startup
		const client = setup.getClient()
		const context = setup.getContext()

		// This code should never execute due to timeout validation failure
		await context.deployProcess('./examples/resources/simple-process.bpmn')
		expect(client).toBeDefined()
	}, 5000) // 5 second timeout - too low for container startup!
})
