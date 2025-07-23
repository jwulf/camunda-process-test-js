import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from '../source'

@CamundaProcessTest
class DebugInputTest {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testDebugInput() {
		// Deploy process and decision
		await this.context.deployProcess('examples/resources/decision-process.bpmn')
		await this.context.deployDecision(
			'examples/resources/approval-decision.dmn'
		)

		// Start process instance
		const camunda = this.client.getCamundaRestClient()
		const processInstance = await camunda.createProcessInstance({
			processDefinitionId: 'decision-process',
			variables: { amount: 2000, requestor: 'employee' },
		})

		// Wait a bit for decision to be processed
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Debug: Check decision search results directly
		const searchResult = await camunda.searchDecisionInstances({
			filter: {
				processInstanceKey: processInstance.processInstanceKey,
			},
			sort: [{ field: 'evaluationDate', order: 'DESC' }],
			page: { from: 0, limit: 1 },
		})

		if (searchResult.items.length > 0) {
			const item = searchResult.items[0]
			console.log('🔍 Decision instance raw data:')
			console.log('  - Key:', item.decisionInstanceKey)
			console.log('  - Decision ID:', item.decisionDefinitionId)
			console.log('  - State:', item.state)
			console.log('  - Result:', JSON.stringify(item.result))
			console.log('  - All fields:', Object.keys(item))
			console.log('  - Full item:', JSON.stringify(item, null, 2))
		}

		// Now test the assertion
		console.log('\n🧪 Testing hasInput assertion...')
		try {
			const decisionAssertion = CamundaAssert.assertThatDecision({
				type: 'processInstanceKey',
				value: processInstance.processInstanceKey,
			})

			await decisionAssertion.hasInput({
				amount: 2000,
				requestor: 'employee',
			})
			console.log('✅ hasInput assertion passed')
		} catch (error) {
			console.error(
				'❌ hasInput assertion failed:',
				error instanceof Error ? error.message : String(error)
			)
		}
	}
}

export { DebugInputTest }
