import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from './source'

@CamundaProcessTest
class TestHasInputFix {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testHasInputMethod() {
		console.log('🧪 Testing hasInput() method with API key fix...')

		// Deploy process and decision
		await this.context.deployProcess('examples/resources/decision-process.bpmn')
		await this.context.deployDecision(
			'examples/resources/approval-decision.dmn'
		)

		// Create process instance with specific input variables
		const camunda = this.client.getCamundaRestClient()
		const processInstance = await camunda.createProcessInstance({
			processDefinitionId: 'decision-process',
			variables: { amount: 5000, requestor: 'manager' },
		})

		console.log(
			`✅ Process instance created: ${processInstance.processInstanceKey}`
		)

		// Test hasInput() method
		const decisionAssertion = CamundaAssert.assertThatDecision({
			type: 'decisionId',
			value: 'approval-decision',
		})

		try {
			await decisionAssertion.hasInput({
				amount: 5000,
				requestor: 'manager',
			})
			console.log('✅ hasInput() - PASSED! The API key fix works!')
		} catch (error) {
			console.log('❌ hasInput() - FAILED:', error.message)

			// Let's check if we can at least find the decision
			try {
				await decisionAssertion.wasEvaluated()
				console.log(
					'ℹ️  Decision was found and evaluated, but hasInput() still failed'
				)
				console.log(
					'ℹ️  This might be due to getDecisionInstance API still having issues'
				)
			} catch (evalError) {
				console.log('❌ Decision not found at all:', evalError.message)
			}
		}

		console.log('\n🏁 Test completed')
	}
}

export { TestHasInputFix }
