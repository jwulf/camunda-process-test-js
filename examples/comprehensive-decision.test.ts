import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from '../source'

@CamundaProcessTest
class ComprehensiveDecisionTest {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testAllDecisionFeatures() {
		try {
			// Deploy process and decision
			await this.context.deployProcess(
				'examples/resources/decision-process.bpmn'
			)
			await this.context.deployDecision(
				'examples/resources/approval-decision.dmn'
			)

			// Test case 1: Manager approval (amount > 1000, requestor = "manager")
			console.log('🧪 Testing manager approval scenario...')
			const camunda = this.client.getCamundaRestClient()
			const processInstance1 = await camunda.createProcessInstance({
				processDefinitionId: 'decision-process',
				variables: { amount: 5000, requestor: 'manager' },
			})

			// Test decision by decision ID
			const decisionByIdAssertion = CamundaAssert.assertThatDecision({
				type: 'decisionId',
				value: 'approval-decision',
			})

			await decisionByIdAssertion.wasEvaluated()
			await decisionByIdAssertion.hasResult({
				approved: true,
				reason: 'Auto-approved for manager',
			})
			await decisionByIdAssertion.belongsToProcessInstance(
				processInstance1.processInstanceKey
			)
			console.log('✅ Manager approval decision assertions passed')

			// Test case 2: Small amount approval (amount <= 1000)
			console.log('🧪 Testing small amount approval scenario...')
			const processInstance2 = await camunda.createProcessInstance({
				processDefinitionId: 'decision-process',
				variables: { amount: 500, requestor: 'employee' },
			})

			// Test decision by process instance key
			const decisionByProcessAssertion = CamundaAssert.assertThatDecision({
				type: 'processInstanceKey',
				value: processInstance2.processInstanceKey,
			})

			await decisionByProcessAssertion.wasEvaluated()
			await decisionByProcessAssertion.hasResult({
				approved: true,
				reason: 'Auto-approved for small amount',
			})
			console.log('✅ Small amount approval decision assertions passed')

			// Test case 3: Employee rejection (amount > 1000, requestor != "manager")
			console.log('🧪 Testing employee rejection scenario...')
			const processInstance3 = await camunda.createProcessInstance({
				processDefinitionId: 'decision-process',
				variables: { amount: 2000, requestor: 'employee' },
			})

			// Test decision with custom selector
			const decisionByCustomAssertion = CamundaAssert.assertThatDecision({
				type: 'custom',
				value: (decision) =>
					decision.processInstanceKey === processInstance3.processInstanceKey,
			})

			await decisionByCustomAssertion.wasEvaluated()
			await decisionByCustomAssertion.hasResult({
				approved: false,
				reason: 'Requires manager approval',
			})
			console.log('✅ Employee rejection decision assertions passed')

			// Test additional assertion methods
			console.log('🧪 Testing additional assertion methods...')
			await decisionByCustomAssertion.hasResultContaining({ approved: false })
			await decisionByCustomAssertion.hasInput({
				amount: 2000,
				requestor: 'employee',
			})
			console.log('✅ Additional assertion methods passed')

			console.log('🎉 All comprehensive decision tests passed!')
		} catch (error) {
			console.error(
				'❌ Test failed:',
				error instanceof Error ? error.message : String(error)
			)
			throw error
		}
	}
}

export { ComprehensiveDecisionTest }
