import { Camunda8 } from '@camunda8/sdk'

import { CamundaProcessTest, CamundaProcessTestContext } from '../source'

@CamundaProcessTest
class DebugSearchResults {
	private client!: Camunda8
	private context!: CamundaProcessTestContext

	async testSearchResultsDebug() {
		console.log('🔍 Debugging search results to understand API behavior...')

		// Deploy process and decision
		await this.context.deployProcess('examples/resources/decision-process.bpmn')
		await this.context.deployDecision(
			'examples/resources/approval-decision.dmn'
		)

		// Create process instance with specific input variables
		const camunda = this.client.getCamundaRestClient()
		await camunda.createProcessInstance({
			processDefinitionId: 'decision-process',
			variables: { amount: 5000, requestor: 'manager' },
		})

		console.log('⏳ Waiting for decision to be evaluated...')

		// Wait a bit for the decision to be processed
		await new Promise((resolve) => setTimeout(resolve, 3000))

		// Search for decision instances
		const searchResult = await camunda.searchDecisionInstances({
			filter: {
				decisionDefinitionId: 'approval-decision',
			},
			sort: [{ field: 'evaluationDate', order: 'DESC' }],
			page: { from: 0, limit: 10 },
		})

		console.log(`📊 Found ${searchResult.items.length} decision instances`)

		if (searchResult.items.length > 0) {
			const item = searchResult.items[0]
			console.log('\n🔍 Raw search result item:')
			console.log('  decisionInstanceKey:', item.decisionInstanceKey)
			console.log('  decisionInstanceId:', item.decisionInstanceId)
			console.log('  state:', item.state)
			console.log('  result:', item.result)
			console.log('  Full item keys:', Object.keys(item))

			// Try getDecisionInstance with both keys
			console.log('\n🧪 Testing getDecisionInstance API calls:')

			// Try with decisionInstanceKey (foreign key - should fail)
			try {
				const withForeignKey = await camunda.getDecisionInstance(
					item.decisionInstanceKey
				)
				console.log(
					'✅ getDecisionInstance(decisionInstanceKey) - SUCCESS (unexpected!)'
				)
				console.log('   Response keys:', Object.keys(withForeignKey))
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error)
				console.log(
					'❌ getDecisionInstance(decisionInstanceKey) - FAILED:',
					errorMessage
				)
			}

			// Try with decisionInstanceId (primary key - should work)
			try {
				const withPrimaryKey = await camunda.getDecisionInstance(
					item.decisionInstanceId
				)
				console.log('✅ getDecisionInstance(decisionInstanceId) - SUCCESS!')
				console.log('   Response keys:', Object.keys(withPrimaryKey))
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error)
				console.log(
					'❌ getDecisionInstance(decisionInstanceId) - FAILED:',
					errorMessage
				)
			}
		} else {
			console.log('❌ No decision instances found in search')
		}

		console.log('\n🏁 Debug completed')
	}
}

export { DebugSearchResults }
