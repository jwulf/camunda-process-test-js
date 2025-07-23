/* eslint-disable @typescript-eslint/no-explicit-any */
import { SearchTasksRequest, UserTask } from '@camunda8/sdk/dist/c8/lib/C8Dto'

import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'
import { UserTaskSelector } from '../types'

import { BaseAssert } from './BaseAssert'

/**
 * Assertions for user tasks.
 * Provides fluent API for verifying user task state and properties.
 */
export class UserTaskAssert extends BaseAssert {
	constructor(
		context: CamundaProcessTestContext,
		private selector: UserTaskSelector,
		timeout: number,
		interval: number
	) {
		super(context, timeout, interval)
	}

	/**
	 * Asserts that the user task exists and is active.
	 */
	async exists(): Promise<this> {
		await this.waitUntil(async () => {
			const task = await this.getUserTask()
			return task !== null
		}, 'User task to exist')
		return this
	}

	/**
	 * Asserts that the user task is assigned to a specific user.
	 */
	async isAssignedTo(assignee: string): Promise<this> {
		await this.waitUntil(async () => {
			const task = await this.getUserTask()
			return task?.assignee === assignee
		}, `User task to be assigned to ${assignee}`)
		return this
	}

	/**
	 * Asserts that the user task is not assigned to any user.
	 */
	async isUnassigned(): Promise<this> {
		await this.waitUntil(async () => {
			const task = await this.getUserTask()
			return !task?.assignee
		}, 'User task to be unassigned')
		return this
	}

	/**
	 * Asserts that the user task has specific candidate groups.
	 */
	async hasCandidateGroups(...groups: string[]): Promise<this> {
		await this.waitUntil(
			async () => {
				const task = await this.getUserTask()
				return groups.every((group) => task?.candidateGroups?.includes(group))
			},
			`User task to have candidate groups: ${groups.join(', ')}`
		)
		return this
	}

	/**
	 * Asserts that the user task has specific variables.
	 */
	async hasVariables(expectedVariables: Record<string, any>): Promise<this> {
		await this.waitUntil(
			async () => {
				const task = await this.getUserTask()
				if (!task) {
					return false
				}

				// Get task variables using the CamundaRestClient
				const variablesResponse = await this.client.searchUserTaskVariables({
					userTaskKey: task.userTaskKey,
				})

				// Convert variables array to object for comparison
				const variableMap: Record<string, any> = {}
				for (const variable of variablesResponse.items) {
					try {
						// Try to parse JSON values, fall back to string
						variableMap[variable.name] = JSON.parse(variable.value)
					} catch {
						variableMap[variable.name] = variable.value
					}
				}

				return Object.entries(expectedVariables).every(
					([key, value]) => variableMap[key] === value
				)
			},
			`User task to have variables: ${JSON.stringify(expectedVariables)}`
		)
		return this
	}

	/**
	 * Asserts that the user task has been completed.
	 */
	async isCompleted(): Promise<this> {
		await this.waitUntil(async () => {
			const task = await this.getUserTask()
			return task?.state === 'COMPLETED'
		}, 'User task to be completed')
		return this
	}

	/**
	 * Completes the user task with the specified variables.
	 */
	async complete(variables: Record<string, any> = {}): Promise<this> {
		const task = await this.getUserTask()
		if (!task) {
			throw new Error('Cannot complete user task: task not found')
		}

		try {
			// Use the CamundaRestClient to complete the task
			await this.client.completeUserTask({
				userTaskKey: task.userTaskKey,
				variables,
			})
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('400')) {
					throw new Error(
						`Cannot complete user task: ${error.message}. Task must be in CREATED state and assigned.`
					)
				}
				if (error.message.includes('403')) {
					throw new Error(
						`Cannot complete user task: Permission denied. ${error.message}`
					)
				}
				if (error.message.includes('404')) {
					throw new Error(
						`Cannot complete user task: Task not found. ${error.message}`
					)
				}
			}
			throw error
		}

		return this
	}

	/**
	 * Assigns the user task to a specific user.
	 */
	async assignTo(assignee: string): Promise<this> {
		const task = await this.getUserTask()
		if (!task) {
			throw new Error('Cannot assign user task: task not found')
		}

		try {
			// Use the CamundaRestClient to assign the task
			await this.client.assignUserTask({
				userTaskKey: task.userTaskKey,
				assignee,
				allowOverride: true, // Allow reassignment in test scenarios
			})
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('400')) {
					throw new Error(
						`Cannot assign user task: ${error.message}. Task must be in CREATED state.`
					)
				}
				if (error.message.includes('403')) {
					throw new Error(
						`Cannot assign user task: Permission denied. ${error.message}`
					)
				}
				if (error.message.includes('404')) {
					throw new Error(
						`Cannot assign user task: Task not found. ${error.message}`
					)
				}
			}
			throw error
		}

		return this
	}

	// ======== Helper methods ========

	private async getUserTask(): Promise<UserTask | null> {
		try {
			if (this.selector.type === 'key') {
				// Direct lookup by task key
				const task = await this.client.getUserTask(
					this.selector.value as string
				)
				return task
			}

			// Build search query based on selector type
			const searchQuery = this.buildSearchQuery()
			if (!searchQuery) {
				return null
			}

			// Use polling to wait for user tasks to be available
			// This is critical for Camunda 8.8+ where user tasks may take time to be indexed
			const startTime = Date.now()
			const timeout = 10000 // 10 seconds timeout
			const interval = 500 // 500ms polling interval

			while (Date.now() - startTime < timeout) {
				// Search for tasks matching the criteria
				const response = await this.client.searchUserTasks({
					...searchQuery,
					filter: {
						...searchQuery.filter,
						state: 'CREATED', // Only search for active user tasks
					},
				})

				if (response.items.length > 0) {
					// For custom selectors, we need to get full task details for each result
					if (
						this.selector.type === 'custom' &&
						typeof this.selector.value === 'function'
					) {
						const predicate = this.selector.value as (task: UserTask) => boolean
						for (const taskDetails of response.items) {
							const fullTask = await this.client.getUserTask(
								taskDetails.userTaskKey
							)
							if (predicate(fullTask)) {
								return fullTask
							}
						}
					} else {
						// For non-custom selectors, get the full details of the first matching task
						return await this.client.getUserTask(response.items[0].userTaskKey)
					}
				}

				// Wait before next poll
				await new Promise((resolve) => setTimeout(resolve, interval))
			}

			// No task found within timeout
			return null
		} catch (error) {
			// Handle 404 errors gracefully - task doesn't exist
			if (error instanceof Error && error.message.includes('404')) {
				return null
			}
			throw error
		}
	}

	private buildSearchQuery(): SearchTasksRequest | null {
		const baseQuery: SearchTasksRequest = {
			page: {
				from: 0,
				limit: 50, // Reasonable limit for test scenarios
			},
		}

		switch (this.selector.type) {
			case 'elementId':
				return {
					...baseQuery,
					filter: {
						elementId: this.selector.value as string,
					},
				}
			case 'assignee':
				return {
					...baseQuery,
					filter: {
						assignee: this.selector.value as string,
					},
				}
			case 'custom':
				// Return base query to fetch all tasks for filtering
				return baseQuery
			default:
				return null
		}
	}
}
