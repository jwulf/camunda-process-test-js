import { Camunda8 } from '@camunda8/sdk'

import { CamundaProcessTest, CamundaProcessTestContext } from '../source'

@CamundaProcessTest
export class DebugEvaluatedInputs {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testEvaluatedInputsStructure() {
		console.log('🧪 Debugging evaluatedInputs field structure...')

		// Deploy process and decision
		await this.context.deployProcess('examples/resources/decision-process.bpmn')
		await this.context.deployDecision(
			'examples/resources/approval-decision.dmn'
		)

		// Create process instance
		const camunda = this.client.getCamundaRestClient()
		const processInstance = await camunda.createProcessInstance({
			processDefinitionId: 'decision-process',
			variables: { amount: 5000, requestor: 'manager' },
		})

		console.log(
			`✅ Process instance created: ${processInstance.processInstanceKey}`
		)

		// Wait a moment for the decision to be evaluated
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Search for the decision instance
		const searchResult = await camunda.searchDecisionInstances({
			filter: {
				decisionDefinitionId: 'approval-decision',
			},
			sort: [{ field: 'evaluationDate', order: 'DESC' }],
			page: { from: 0, limit: 1 },
		})

		console.log('📊 Search result:', JSON.stringify(searchResult, null, 2))

		if (searchResult.items.length > 0) {
			const decisionInstanceId = searchResult.items[0].decisionInstanceId
			console.log(`🔍 Decision instance ID: ${decisionInstanceId}`)

			try {
				// Get the full decision instance details
				const decisionInstance =
					await camunda.getDecisionInstance(decisionInstanceId)
				console.log(
					'📋 Full decision instance response:',
					JSON.stringify(decisionInstance, null, 2)
				)

				if (decisionInstance.evaluatedInputs) {
					console.log(
						'🎯 evaluatedInputs found:',
						JSON.stringify(decisionInstance.evaluatedInputs, null, 2)
					)
				} else {
					console.log('❌ No evaluatedInputs field found')
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error)
				console.log('❌ Failed to get decision instance details:', errorMessage)
			}
		} else {
			console.log('❌ No decision instances found')
		}

		console.log('\n🏁 Debug completed')
	}
}
