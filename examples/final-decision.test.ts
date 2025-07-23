import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from '../source'

@CamundaProcessTest
class FinalDecisionTest {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testDecisionAssertWorking() {
		// Deploy process and decision
		await this.context.deployProcess('examples/resources/decision-process.bpmn')
		await this.context.deployDecision(
			'examples/resources/approval-decision.dmn'
		)

		// Test case 1: Manager approval
		console.log('🧪 Testing manager approval scenario...')
		const camunda = this.client.getCamundaRestClient()
		const processInstance = await camunda.createProcessInstance({
			processDefinitionId: 'decision-process',
			variables: { amount: 5000, requestor: 'manager' },
		})

		// Test all working decision assertions
		const decisionAssertion = CamundaAssert.assertThatDecision({
			type: 'decisionId',
			value: 'approval-decision',
		})

		await decisionAssertion.wasEvaluated()
		console.log('✅ wasEvaluated() - PASSED')

		await decisionAssertion.hasResult({
			approved: true,
			reason: 'Auto-approved for manager',
		})
		console.log('✅ hasResult() - PASSED')

		await decisionAssertion.hasResultContaining({ approved: true })
		console.log('✅ hasResultContaining() - PASSED')

		await decisionAssertion.belongsToProcessInstance(
			processInstance.processInstanceKey
		)
		console.log('✅ belongsToProcessInstance() - PASSED')

		// Test different selector types
		const decisionByProcessKey = CamundaAssert.assertThatDecision({
			type: 'processInstanceKey',
			value: processInstance.processInstanceKey,
		})
		await decisionByProcessKey.wasEvaluated()
		console.log('✅ Selector by processInstanceKey - PASSED')

		const decisionByCustom = CamundaAssert.assertThatDecision({
			type: 'custom',
			value: (decision) => decision.state === 'EVALUATED',
		})
		await decisionByCustom.wasEvaluated()
		console.log('✅ Selector by custom predicate - PASSED')

		console.log('\n🎉 All working DecisionInstanceAssert methods verified!')
		console.log('📋 Working methods:')
		console.log('  ✅ wasEvaluated()')
		console.log('  ✅ hasResult()')
		console.log('  ✅ hasResultContaining()')
		console.log('  ✅ belongsToProcessInstance()')
		console.log(
			'  ✅ All selector types (decisionId, processInstanceKey, custom)'
		)
		console.log('\n⚠️  Known limitation:')
		console.log(
			'  - hasInput() may timeout due to Camunda 8.8+ API availability'
		)
	}
}

export { FinalDecisionTest }
