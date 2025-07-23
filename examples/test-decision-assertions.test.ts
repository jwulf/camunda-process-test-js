import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from '../source'

@CamundaProcessTest
class TestDecisionAssertions {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testDecisionAssertionsWork() {
		try {
			// Deploy process and decision
			await this.context.deployProcess(
				'examples/resources/decision-process.bpmn'
			)
			await this.context.deployDecision(
				'examples/resources/approval-decision.dmn'
			)

			// Start process instance
			const camunda = this.client.getCamundaRestClient()
			const processInstance = await camunda.createProcessInstance({
				processDefinitionId: 'decision-process',
				variables: { amount: 5000, requestor: 'manager' },
			})

			// Test all decision assertions
			const decisionAssertion = CamundaAssert.assertThatDecision({
				type: 'decisionId',
				value: 'approval-decision',
			})

			console.log('🧪 Testing wasEvaluated()...')
			await decisionAssertion.wasEvaluated()
			console.log('✅ wasEvaluated() passed')

			console.log('🧪 Testing hasResult()...')
			await decisionAssertion.hasResult({
				approved: true,
				reason: 'Auto-approved for manager',
			})
			console.log('✅ hasResult() passed')

			console.log('🧪 Testing belongsToProcessInstance()...')
			await decisionAssertion.belongsToProcessInstance(
				processInstance.processInstanceKey
			)
			console.log('✅ belongsToProcessInstance() passed')

			console.log('🎉 All decision assertions work!')
		} catch (error) {
			console.error(
				'❌ Test failed:',
				error instanceof Error ? error.message : String(error)
			)
			throw error
		}
	}
}

export { TestDecisionAssertions }
