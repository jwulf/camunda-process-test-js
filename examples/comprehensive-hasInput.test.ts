import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from '../source'

@CamundaProcessTest
export class ComprehensiveHasInputTest {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testHasInputWithVariousTypes() {
		console.log('🧪 Testing hasInput() with various input types...')

		// Deploy process and decision
		await this.context.deployProcess('examples/resources/decision-process.bpmn')
		await this.context.deployDecision(
			'examples/resources/approval-decision.dmn'
		)

		// Test 1: String and numeric inputs (manager scenario)
		console.log('Test 1: String and numeric inputs')
		const camunda = this.client.getCamundaRestClient()
		await camunda.createProcessInstance({
			processDefinitionId: 'decision-process',
			variables: { amount: 5000, requestor: 'manager' },
		})

		const managerDecision = CamundaAssert.assertThatDecision({
			type: 'decisionId',
			value: 'approval-decision',
		})

		// Test exact match
		await managerDecision.hasInput({
			amount: 5000,
			requestor: 'manager',
		})
		console.log('✅ Exact input match works')

		// Test partial match
		await managerDecision.hasInput({
			amount: 5000,
		})
		console.log('✅ Partial input match works')

		// Test 2: Different scenario with different types
		console.log('\nTest 2: Different inputs (employee scenario)')
		await camunda.createProcessInstance({
			processDefinitionId: 'decision-process',
			variables: { amount: 1500, requestor: 'employee' },
		})

		// Wait for decision evaluation
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const employeeDecision = CamundaAssert.assertThatDecision({
			type: 'processInstanceKey',
			value: (
				await camunda.searchProcessInstances({
					filter: { processDefinitionId: 'decision-process' },
					sort: [{ field: 'startDate', order: 'DESC' }],
					page: { from: 0, limit: 1 },
				})
			).items[0].processInstanceKey,
		})

		await employeeDecision.hasInput({
			amount: 1500,
			requestor: 'employee',
		})
		console.log('✅ Employee scenario input match works')

		console.log(
			'\n🎉 All hasInput() tests passed! The feature is fully functional.'
		)
	}
}
