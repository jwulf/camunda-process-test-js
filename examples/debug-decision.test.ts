import { Camunda8 } from '@camunda8/sdk'

import {
	CamundaAssert,
	CamundaProcessTest,
	CamundaProcessTestContext,
} from '../source'

@CamundaProcessTest
class DebugDecisionAssert {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testDebugDecision() {
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
			console.log(
				'✅ Process instance started:',
				processInstance.processInstanceKey
			)

			// Wait a bit for the decision to be processed
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// Debug: Direct API call to search decision instances
			console.log('🔍 Searching for decision instances...')
			try {
				const allDecisions = await camunda.searchDecisionInstances({
					filter: {},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 10 },
				})
				console.log(
					'📋 All decision instances found:',
					allDecisions.items.length
				)
				allDecisions.items.forEach((item, index) => {
					console.log(
						`  ${index + 1}. Decision ${item.decisionInstanceKey}: ${item.decisionDefinitionId} (state: ${item.state})`
					)
				})
			} catch (searchError) {
				console.error(
					'❌ Search error:',
					searchError instanceof Error
						? searchError.message
						: String(searchError)
				)
			}

			// Debug: Search by decision ID
			try {
				const byDecisionId = await camunda.searchDecisionInstances({
					filter: {
						decisionDefinitionId: 'approval-decision',
					},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 1 },
				})
				console.log('🎯 Decision instances by ID:', byDecisionId.items.length)
				if (byDecisionId.items.length > 0) {
					const item = byDecisionId.items[0]
					console.log(
						`  Found: ${item.decisionInstanceKey} (state: ${item.state})`
					)
					console.log(
						`  Using decisionInstanceId for API call: ${item.decisionInstanceId}`
					)

					// Get full details using the correct primary key
					const fullDecision = await camunda.getDecisionInstance(
						item.decisionInstanceId
					)
					console.log('📄 Full decision details:', {
						key: fullDecision.decisionInstanceKey,
						state: fullDecision.state,
						result: fullDecision.result,
						processInstanceKey: fullDecision.processInstanceKey,
						evaluatedInputs: fullDecision.evaluatedInputs,
					})
				}
			} catch (detailError) {
				console.error(
					'❌ Detail lookup error:',
					detailError instanceof Error
						? detailError.message
						: String(detailError)
				)
			}

			// Now try the assertion
			console.log('🧪 Testing DecisionInstanceAssert...')
			const decisionAssertion = CamundaAssert.assertThatDecision({
				type: 'decisionId',
				value: 'approval-decision',
			})

			await decisionAssertion.wasEvaluated()
			console.log('✅ Decision assertion passed!')
		} catch (error) {
			console.error(
				'❌ Test failed:',
				error instanceof Error ? error.message : String(error)
			)
			throw error
		}
	}
}

export { DebugDecisionAssert }
