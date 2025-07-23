/**
 * Debug test for user task functionality
 */

import { CamundaAssert, setupCamundaProcessTest } from '../source'

describe('Debug User Task', () => {
	const setup = setupCamundaProcessTest()

	test('should debug user task creation and search', async () => {
		const client = setup.getClient()
		const context = setup.getContext()

		console.log('📋 Deploying user task process...')
		await context.deployProcess('examples/resources/user-task-process.bpmn')

		console.log('🚀 Starting process instance...')
		const camunda = client.getCamundaRestClient()
		const processInstance = await camunda.createProcessInstance({
			processDefinitionId: 'user-task-process',
			variables: { requestor: 'john.doe' },
		})

		console.log(
			'✅ Process instance created:',
			processInstance.processInstanceKey
		)

		// Wait a bit for the user task to be created
		console.log('⏳ Waiting for user task creation...')
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Try to search for all user tasks
		console.log('🔍 Searching for all user tasks...')
		try {
			const allTasks = await camunda.searchUserTasks({
				page: { from: 0, limit: 10 },
			})
			console.log('📋 Found user tasks:', allTasks.items.length)
			allTasks.items.forEach((task, index) => {
				console.log(`  Task ${index + 1}:`, {
					userTaskKey: task.userTaskKey,
					elementInstanceKey: task.elementInstanceKey,
					processInstanceKey: task.processInstanceKey,
					processDefinitionKey: task.processDefinitionKey,
				})
			})

			// Try to get detailed task info for each task
			for (const taskDetails of allTasks.items) {
				console.log(`🔍 Getting details for task ${taskDetails.userTaskKey}...`)
				try {
					const fullTask = await camunda.getUserTask(taskDetails.userTaskKey)
					console.log('✅ Task details:', {
						name: fullTask.name,
						state: fullTask.state,
						elementId: fullTask.elementId,
						assignee: fullTask.assignee,
						candidateGroups: fullTask.candidateGroups,
						processDefinitionId: fullTask.processDefinitionId,
					})
				} catch (error) {
					console.error(
						'❌ Failed to get task details:',
						(error as Error).message
					)
				}
			}
		} catch (error) {
			console.error('❌ Failed to search user tasks:', (error as Error).message)
			console.error('Error details:', error)
		}

		// Try using our assertion
		console.log('🧪 Testing UserTaskAssert...')
		try {
			const userTaskAssertion = CamundaAssert.assertThatUserTask({
				type: 'elementId',
				value: 'approve-request',
			})

			console.log('🔍 Checking if user task exists...')
			await userTaskAssertion.exists()
			console.log('✅ User task exists!')
		} catch (error) {
			console.error('❌ UserTaskAssert failed:', (error as Error).message)
		}

		console.log('🏁 Debug complete')
	})
})
