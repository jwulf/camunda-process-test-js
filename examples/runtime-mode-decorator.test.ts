import { Camunda8 } from '@camunda8/sdk'

import { CamundaProcessTest, CamundaProcessTestContext } from '../source'

@CamundaProcessTest
export class RuntimeModeDetectionTest {
	private client!: Camunda8 // Auto-injected
	private context!: CamundaProcessTestContext // Auto-injected

	async testRuntimeModeDetection() {
		const runtimeMode = this.context.getRuntimeMode()

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
	}
}
