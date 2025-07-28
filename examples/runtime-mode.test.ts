import { setupCamundaProcessTest } from '../source'

describe('Runtime Mode Detection Example', () => {
	const setup = setupCamundaProcessTest()

	test('should be able to get runtime mode for differential behavior', async () => {
		const context = setup.getContext()
		const runtimeMode = context.getRuntimeMode()

		console.log('Runtime mode:', runtimeMode)
		expect(['MANAGED', 'REMOTE']).toContain(runtimeMode)

		// Example of differential test behavior based on runtime mode
		if (runtimeMode === 'MANAGED') {
			console.log('Running in MANAGED mode - Docker containers available')
			// Test behavior specific to container environment
		} else {
			console.log('Running in REMOTE mode - Connecting to external instance')
			// Test behavior specific to remote environment
		}
	})
})
