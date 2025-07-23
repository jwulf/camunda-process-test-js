import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from '../source'

@CamundaProcessTest
class TestDecisionOnly {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testProcessWithDecision() {
		try {
			// Deploy process and decision
			await this.context.deployProcess(
				'examples/resources/decision-process.bpmn'
			)
			console.log('✅ Process deployed successfully')

			await this.context.deployDecision(
				'examples/resources/approval-decision.dmn'
			)
			console.log('✅ Decision deployed successfully')

			// Start process instance
			const camunda = this.client.getCamundaRestClient()
			const processInstance = await camunda.createProcessInstance({
				processDefinitionId: 'decision-process',
				variables: { amount: 5000, requestor: 'manager' },
			})
			console.log(
				'✅ Process instance started:',
				processInstance.processInstanceKey
			)

			// Verify decision was evaluated
			const decisionAssertion = CamundaAssert.assertThatDecision({
				type: 'decisionId',
				value: 'approval-decision',
			})
			await decisionAssertion.wasEvaluated()
			console.log('✅ Decision was evaluated')

			await decisionAssertion.hasResult({
				approved: true,
				reason: 'Auto-approved for manager',
			})
			console.log('✅ Decision has expected result')

			await decisionAssertion.belongsToProcessInstance(
				processInstance.processInstanceKey
			)
			console.log('✅ Decision belongs to process instance')
		} catch (error) {
			console.error(
				'❌ Test failed:',
				error instanceof Error ? error.message : String(error)
			)
			throw error
		}
	}
}

export { TestDecisionOnly }
