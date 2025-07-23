/**
 * Simple debug test to check user task API availability
 */

import { setupCamundaProcessTest } from '../source'

describe('Debug User Task API', () => {
	const setup = setupCamundaProcessTest()

	test('should check if user task API is available', async () => {
		const client = setup.getClient()
		const camunda = client.getCamundaRestClient()

		console.log('🔍 Testing user task API availability...')

		try {
			// Test the API without any process
			const result = await camunda.searchUserTasks({
				page: { from: 0, limit: 1 },
			})
			console.log('✅ searchUserTasks API is working')
			console.log('Response structure:', {
				itemsLength: result.items.length,
				page: result.page,
			})
		} catch (error) {
			console.error('❌ searchUserTasks API failed:', (error as Error).message)
			console.error('Full error:', error)
		}

		// Test getUserTask with a dummy ID
		try {
			await camunda.getUserTask('999999999999999999')
		} catch (error) {
			const errorMsg = (error as Error).message
			if (errorMsg.includes('404')) {
				console.log(
					'✅ getUserTask API is working (returned 404 as expected for non-existent task)'
				)
			} else {
				console.error(
					'❌ getUserTask API failed with unexpected error:',
					errorMsg
				)
			}
		}

		console.log('🏁 API test complete')
	})
})
