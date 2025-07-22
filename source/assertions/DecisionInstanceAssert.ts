/* eslint-disable @typescript-eslint/no-explicit-any */
import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'
import { DecisionSelector } from '../types'

import { BaseAssert } from './BaseAssert'

/**
 * Assertions for decision instances.
 * Provides fluent API for verifying decision evaluation results.
 */
export class DecisionInstanceAssert extends BaseAssert {
	constructor(
		context: CamundaProcessTestContext,
		private selector: DecisionSelector,
		timeout: number,
		interval: number
	) {
		super(context, timeout, interval)
	}

	/**
	 * Asserts that the decision instance exists.
	 */
	async exists(): Promise<this> {
		await this.waitUntil(async () => {
			const decision = await this.getDecisionInstance()
			return decision !== null
		}, 'Decision instance to exist')
		return this
	}

	/**
	 * Asserts that the decision was evaluated successfully.
	 */
	async wasEvaluated(): Promise<this> {
		await this.waitUntil(async () => {
			const decision = (await this.getDecisionInstance()) as Record<
				string,
				unknown
			>
			return decision?.state === 'EVALUATED'
		}, 'Decision to be evaluated')
		return this
	}

	/**
	 * Asserts that the decision evaluation failed.
	 */
	async hasFailed(): Promise<this> {
		await this.waitUntil(async () => {
			const decision = (await this.getDecisionInstance()) as Record<
				string,
				unknown
			>
			return decision?.state === 'FAILED'
		}, 'Decision evaluation to have failed')
		return this
	}

	/**
	 * Asserts that the decision has a specific result.
	 */
	async hasResult(expectedResult: any): Promise<this> {
		await this.waitUntil(
			async () => {
				const decision = await this.getDecisionInstance()
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return this.deepEqual((decision as any)?.result, expectedResult)
			},
			`Decision to have result: ${JSON.stringify(expectedResult)}`
		)
		return this
	}

	/**
	 * Asserts that the decision result contains specific key-value pairs.
	 */
	async hasResultContaining(
		expectedPartialResult: Record<string, any>
	): Promise<this> {
		await this.waitUntil(
			async () => {
				const decision = await this.getDecisionInstance()
				if (!decision?.result || typeof decision.result !== 'object') {
					return false
				}

				return Object.entries(expectedPartialResult).every(
					([key, value]) => decision.result[key] === value
				)
			},
			`Decision result to contain: ${JSON.stringify(expectedPartialResult)}`
		)
		return this
	}

	/**
	 * Asserts that the decision result is an array with a specific length.
	 */
	async hasResultWithLength(expectedLength: number): Promise<this> {
		await this.waitUntil(async () => {
			const decision = await this.getDecisionInstance()
			return (
				Array.isArray(decision?.result) &&
				decision.result.length === expectedLength
			)
		}, `Decision result to be array with length ${expectedLength}`)
		return this
	}

	/**
	 * Asserts that the decision evaluation has a specific input.
	 */
	async hasInput(expectedInput: Record<string, any>): Promise<this> {
		await this.waitUntil(
			async () => {
				const decision = await this.getDecisionInstance()
				return this.deepEqual(decision?.input, expectedInput)
			},
			`Decision to have input: ${JSON.stringify(expectedInput)}`
		)
		return this
	}

	/**
	 * Asserts that the decision belongs to a specific process instance.
	 */
	async belongsToProcessInstance(processInstanceKey: string): Promise<this> {
		await this.waitUntil(async () => {
			const decision = await this.getDecisionInstance()
			return decision?.processInstanceKey === processInstanceKey
		}, `Decision to belong to process instance ${processInstanceKey}`)
		return this
	}

	// ======== Helper methods ========

	/**
	 * Retrieves a decision instance based on the selector type.
	 * Uses the CamundaRestClient to query actual decision instances from Camunda 8.8+ API.
	 *
	 * @returns Promise resolving to the decision instance data or null if not found
	 * @private
	 */
	private async getDecisionInstance(): Promise<any> {
		// Use CamundaRestClient to query actual decision instances from Camunda 8.8+ API
		try {
			if (this.selector.type === 'key') {
				// Direct lookup by decision instance key
				const decisionInstance = await this.client.getDecisionInstance(
					this.selector.value as string
				)
				return this.transformDecisionInstanceResponse(decisionInstance)
			}

			if (this.selector.type === 'decisionId') {
				// Search by decision definition ID
				const searchResult = await this.client.searchDecisionInstances({
					filter: {
						decisionDefinitionId: this.selector.value as string,
					},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 1 },
				})

				if (searchResult.items.length === 0) {
					return null
				}

				// Get the full decision instance details
				const decisionInstance = await this.client.getDecisionInstance(
					searchResult.items[0].decisionInstanceKey
				)
				return this.transformDecisionInstanceResponse(decisionInstance)
			}

			if (this.selector.type === 'processInstanceKey') {
				// Search by process instance key
				const searchResult = await this.client.searchDecisionInstances({
					filter: {
						processInstanceKey: this.selector.value as string,
					},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 1 },
				})

				if (searchResult.items.length === 0) {
					return null
				}

				// Get the full decision instance details
				const decisionInstance = await this.client.getDecisionInstance(
					searchResult.items[0].decisionInstanceKey
				)
				return this.transformDecisionInstanceResponse(decisionInstance)
			}

			if (this.selector.type === 'custom') {
				// Search all decision instances and apply custom predicate
				const searchResult = await this.client.searchDecisionInstances({
					filter: {},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 100 }, // Reasonable limit for custom search
				})

				// Apply custom predicate function
				const predicate = this.selector.value as (decision: any) => boolean
				const matchingItem = searchResult.items.find((item) => {
					const transformedItem =
						this.transformDecisionInstanceSearchResult(item)
					return predicate(transformedItem)
				})

				if (!matchingItem) {
					return null
				}

				// Get the full decision instance details
				const decisionInstance = await this.client.getDecisionInstance(
					matchingItem.decisionInstanceKey
				)
				return this.transformDecisionInstanceResponse(decisionInstance)
			}

			return null
		} catch (error) {
			// Return null for not found errors, re-throw other errors
			if (error instanceof Error && error.message.includes('404')) {
				return null
			}
			throw error
		}
	}

	/**
	 * Transform the GetDecisionInstanceResponse to match the expected interface.
	 * Handles JSON parsing of result field and maps API response fields to the internal format.
	 *
	 * @param response - The response from CamundaRestClient.getDecisionInstance()
	 * @returns Transformed decision instance object or null if response is empty
	 * @private
	 */
	private transformDecisionInstanceResponse(response: any): any {
		if (!response) {
			return null
		}

		// Parse the result JSON if it's a string
		let parsedResult = response.result
		try {
			if (typeof response.result === 'string') {
				parsedResult = JSON.parse(response.result)
			}
		} catch {
			// Keep as string if parsing fails
			parsedResult = response.result
		}

		return {
			key: response.decisionInstanceKey,
			decisionId: response.decisionDefinitionId,
			decisionName: response.decisionDefinitionName,
			decisionVersion: response.decisionDefinitionVersion,
			decisionType: response.decisionDefinitionType,
			state: response.state,
			result: parsedResult,
			input: response.input || {},
			processInstanceKey: response.processInstanceKey,
			processDefinitionKey: response.processDefinitionKey,
			evaluationDate: response.evaluationDate,
			evaluationFailure: response.evaluationFailure,
			tenantId: response.tenantId,
		}
	}

	/**
	 * Transform search result items to match the expected interface.
	 * Used for processing items from searchDecisionInstances response.
	 *
	 * @param item - An item from the CamundaRestClient.searchDecisionInstances() response
	 * @returns Transformed decision instance object or null if item is empty
	 * @private
	 */
	private transformDecisionInstanceSearchResult(item: any): any {
		if (!item) {
			return null
		}

		// Parse the result JSON if it's a string
		let parsedResult = item.result
		try {
			if (typeof item.result === 'string') {
				parsedResult = JSON.parse(item.result)
			}
		} catch {
			// Keep as string if parsing fails
			parsedResult = item.result
		}

		return {
			key: item.decisionInstanceKey,
			decisionId: item.decisionDefinitionId,
			decisionName: item.decisionDefinitionName,
			decisionVersion: item.decisionDefinitionVersion,
			decisionType: item.decisionType,
			state: item.state,
			result: parsedResult,
			input: item.input || {},
			processInstanceKey: item.processInstanceKey,
			processDefinitionKey: item.processDefinitionKey,
			evaluationDate: item.evaluationDate,
			evaluationFailure: item.evaluationFailure,
			tenantId: item.tenantId,
		}
	}

	private deepEqual(obj1: any, obj2: any): boolean {
		if (obj1 === obj2) return true

		if (obj1 == null || obj2 == null) return false

		if (typeof obj1 !== typeof obj2) return false

		if (typeof obj1 !== 'object') return obj1 === obj2

		const keys1 = Object.keys(obj1)
		const keys2 = Object.keys(obj2)

		if (keys1.length !== keys2.length) return false

		return keys1.every((key) =>
			this.deepEqual(
				(obj1 as Record<string, unknown>)[key],
				(obj2 as Record<string, unknown>)[key]
			)
		)
	}
}
