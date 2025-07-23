/* eslint-disable @typescript-eslint/no-explicit-any */
import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'
import { DecisionSelector } from '../types'

import { BaseAssert } from './BaseAssert'

// Decision result and input types - generic to handle various decision output types
type DecisionResult = unknown
type DecisionInput = Record<string, unknown>

// API response interfaces for CamundaRestClient methods
interface SearchDecisionInstanceItem {
	decisionInstanceId: string
	decisionInstanceKey: string
	decisionDefinitionId: string
	decisionDefinitionName: string
	decisionDefinitionVersion: number
	decisionType: string
	state: string
	result: string | DecisionResult
	input?: string | DecisionInput // Make input optional as it might not be present in all responses
	processInstanceKey: string
	processDefinitionKey: string
	evaluationDate: string
	evaluationFailure?: string
	tenantId: string
}

interface GetDecisionInstanceResponse {
	decisionInstanceKey: string
	decisionDefinitionId: string
	decisionDefinitionName: string
	decisionDefinitionVersion: number
	decisionDefinitionType: string
	state: string
	result: string | DecisionResult
	evaluatedInputs?: Array<{
		inputName: string
		inputValue: string
	}>
	processInstanceKey: string
	processDefinitionKey: string
	evaluationDate: string
	evaluationFailure?: string
	tenantId: string
}

// Internal transformed decision instance type
interface TransformedDecisionInstance {
	key: string
	decisionId: string
	decisionName: string
	decisionVersion: number
	decisionType: string
	state: string
	result: DecisionResult
	input: DecisionInput
	processInstanceKey: string
	processDefinitionKey: string
	evaluationDate: string
	evaluationFailure?: string
	tenantId: string
}

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
			const decision = await this.getDecisionInstance()
			return decision?.state === 'EVALUATED'
		}, 'Decision to be evaluated')
		return this
	}

	/**
	 * Asserts that the decision evaluation failed.
	 */
	async hasFailed(): Promise<this> {
		await this.waitUntil(async () => {
			const decision = await this.getDecisionInstance()
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
				return this.deepEqual(decision?.result, expectedResult)
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

				return Object.entries(expectedPartialResult).every(([key, value]) => {
					const result = decision.result as Record<string, unknown>
					return result[key] === value
				})
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
	 *
	 * This method uses the getDecisionInstance API to access the evaluatedInputs field
	 * which contains the input data used during decision evaluation.
	 */
	async hasInput(expectedInput: Record<string, any>): Promise<this> {
		await this.waitUntil(
			async () => {
				// For input assertions, we need to try the getDecisionInstance API
				// as search results don't include input data
				try {
					const decisionKey = await this.getDecisionInstanceKey()
					if (!decisionKey) {
						return false
					}

					// Try to get the full decision instance details with retries
					let attempts = 0
					const maxAttempts = 3
					let decisionDetails = null

					while (attempts < maxAttempts && !decisionDetails) {
						try {
							decisionDetails =
								await this.client.getDecisionInstance(decisionKey)
							break
						} catch (error) {
							attempts++
							if (
								attempts < maxAttempts &&
								error instanceof Error &&
								error.message.includes('404')
							) {
								// Wait a bit before retrying - decision details might not be available immediately
								await new Promise((resolve) => setTimeout(resolve, 1000))
								continue
							}
							throw error
						}
					}

					if (!decisionDetails) {
						return false
					}

					const transformedDecision =
						this.transformDecisionInstanceResponse(decisionDetails)
					return this.containsInput(transformedDecision?.input, expectedInput)
				} catch (error) {
					// If decision instance details are not available, return false to keep retrying
					if (error instanceof Error && error.message.includes('404')) {
						return false
					}
					throw error
				}
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
	 * Gets the decision instance ID (primary key) for the current selector.
	 * Used for operations that require the decision instance ID specifically.
	 *
	 * Note: Due to Camunda API design issue #35630, the getDecisionInstance() API
	 * expects decisionInstanceId (primary key), not decisionInstanceKey (foreign key).
	 *
	 * @returns Promise resolving to the decision instance ID or null if not found
	 * @private
	 */
	private async getDecisionInstanceKey(): Promise<string | null> {
		try {
			if (this.selector.type === 'key') {
				// The user might pass either decisionInstanceKey (foreign key) or decisionInstanceId (primary key)
				// We need to search to find the correct decisionInstanceId
				const keyValue = this.selector.value as string

				// First try searching by decisionInstanceKey (foreign key)
				let searchResult = await this.client.searchDecisionInstances({
					filter: {
						decisionInstanceKey: keyValue,
					},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 1 },
				})

				if (searchResult.items.length > 0) {
					return searchResult.items[0].decisionInstanceId
				}

				// If not found, maybe they passed the decisionInstanceId directly
				// Try searching without filter and find matching decisionInstanceId
				searchResult = await this.client.searchDecisionInstances({
					filter: {},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 100 },
				})

				const matchingItem = searchResult.items.find(
					(item) => item.decisionInstanceId === keyValue
				)
				if (matchingItem) {
					return matchingItem.decisionInstanceId
				}

				return null
			}

			if (this.selector.type === 'decisionId') {
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

				// Return the actual primary key (decisionInstanceId), not the foreign key
				return searchResult.items[0].decisionInstanceId
			}

			if (this.selector.type === 'processInstanceKey') {
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

				// Return the actual primary key (decisionInstanceId), not the foreign key
				return searchResult.items[0].decisionInstanceId
			}

			if (this.selector.type === 'custom') {
				const searchResult = await this.client.searchDecisionInstances({
					filter: {},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 100 },
				})

				const predicate = this.selector.value as (decision: any) => boolean
				const matchingItem = searchResult.items.find((item) => {
					const transformedItem =
						this.transformDecisionInstanceSearchResult(item)
					return transformedItem && predicate(transformedItem)
				})

				if (!matchingItem) {
					return null
				}

				// Return the actual primary key (decisionInstanceId), not the foreign key
				return matchingItem.decisionInstanceId
			}

			return null
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null
			}
			throw error
		}
	}

	/**
	 * Retrieves a decision instance based on the selector type.
	 * Uses the CamundaRestClient to query actual decision instances from Camunda 8.8+ API.
	 *
	 * @returns Promise resolving to the decision instance data or null if not found
	 * @private
	 */
	private async getDecisionInstance(): Promise<TransformedDecisionInstance | null> {
		// Use CamundaRestClient to query actual decision instances from Camunda 8.8+ API
		try {
			if (this.selector.type === 'key') {
				// For 'key' selector, we need to determine if it's a decisionInstanceKey or decisionInstanceId
				// and get the correct primary key for the API call
				const keyValue = this.selector.value as string

				// First try searching by decisionInstanceKey (foreign key)
				let searchResult = await this.client.searchDecisionInstances({
					filter: {
						decisionInstanceKey: keyValue,
					},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 1 },
				})

				if (searchResult.items.length > 0) {
					// Found by foreign key, try to get full details using primary key
					try {
						const decisionInstance = await this.client.getDecisionInstance(
							searchResult.items[0].decisionInstanceId
						)
						return this.transformDecisionInstanceResponse(decisionInstance)
					} catch (error) {
						// Fallback to search result if getDecisionInstance fails
						return this.transformDecisionInstanceSearchResult(
							searchResult.items[0]
						)
					}
				}

				// If not found by foreign key, try searching all and match by decisionInstanceId
				searchResult = await this.client.searchDecisionInstances({
					filter: {},
					sort: [{ field: 'evaluationDate', order: 'DESC' }],
					page: { from: 0, limit: 100 },
				})

				const matchingItem = searchResult.items.find(
					(item) => item.decisionInstanceId === keyValue
				)

				if (matchingItem) {
					// Found by primary key, try to get full details
					try {
						const decisionInstance =
							await this.client.getDecisionInstance(keyValue)
						return this.transformDecisionInstanceResponse(decisionInstance)
					} catch (error) {
						// Fallback to search result if getDecisionInstance fails
						return this.transformDecisionInstanceSearchResult(matchingItem)
					}
				}

				return null
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

				// Use search result directly instead of trying getDecisionInstance()
				return this.transformDecisionInstanceSearchResult(searchResult.items[0])
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

				// Use search result directly instead of trying getDecisionInstance()
				return this.transformDecisionInstanceSearchResult(searchResult.items[0])
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
					return transformedItem && predicate(transformedItem)
				})

				if (!matchingItem) {
					return null
				}

				// Use search result directly instead of trying getDecisionInstance()
				return this.transformDecisionInstanceSearchResult(matchingItem)
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
	 * Transforms evaluatedInputs array into a key-value object for easier assertion.
	 *
	 * @param response - The response from CamundaRestClient.getDecisionInstance()
	 * @returns Transformed decision instance object or null if response is empty
	 * @private
	 */
	private transformDecisionInstanceResponse(
		response: GetDecisionInstanceResponse
	): TransformedDecisionInstance | null {
		if (!response) {
			return null
		}

		// Parse the result JSON if it's a string
		let parsedResult: DecisionResult = response.result
		try {
			if (typeof response.result === 'string') {
				parsedResult = JSON.parse(response.result)
			}
		} catch {
			// Keep as string if parsing fails
			parsedResult = response.result
		}

		// Transform evaluatedInputs array into a key-value object
		let transformedInput: DecisionInput = {}
		if (response.evaluatedInputs && Array.isArray(response.evaluatedInputs)) {
			transformedInput = response.evaluatedInputs.reduce(
				(
					acc: Record<string, unknown>,
					input: { inputName: string; inputValue: string }
				) => {
					// Use inputName as key (lowercase for consistency)
					const key = input.inputName.toLowerCase()

					// Parse inputValue - it might be JSON-escaped or a plain value
					let parsedValue: unknown = input.inputValue
					try {
						// Try to parse as JSON first (handles escaped strings and numbers)
						parsedValue = JSON.parse(input.inputValue)
					} catch {
						// If JSON parsing fails, try to convert numbers
						if (
							typeof input.inputValue === 'string' &&
							!isNaN(Number(input.inputValue))
						) {
							parsedValue = Number(input.inputValue)
						} else {
							// Keep as string if all parsing fails
							parsedValue = input.inputValue
						}
					}
					acc[key] = parsedValue
					return acc
				},
				{}
			)
		}

		return {
			key: response.decisionInstanceKey,
			decisionId: response.decisionDefinitionId,
			decisionName: response.decisionDefinitionName,
			decisionVersion: response.decisionDefinitionVersion,
			decisionType: response.decisionDefinitionType,
			state: response.state,
			result: parsedResult,
			input: transformedInput,
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
	private transformDecisionInstanceSearchResult(
		item: SearchDecisionInstanceItem
	): TransformedDecisionInstance | null {
		if (!item) {
			return null
		}

		// Parse the result JSON if it's a string
		let parsedResult: DecisionResult = item.result
		try {
			if (typeof item.result === 'string') {
				parsedResult = JSON.parse(item.result)
			}
		} catch {
			// Keep as string if parsing fails
			parsedResult = item.result
		}

		// Parse the input JSON if it's a string
		let parsedInput: DecisionInput = {}
		try {
			if (typeof item.input === 'string') {
				parsedInput = JSON.parse(item.input)
			} else if (item.input && typeof item.input === 'object') {
				parsedInput = item.input as DecisionInput
			}
		} catch {
			// Keep as string if parsing fails, default to empty object
			parsedInput = (item.input as DecisionInput) || {}
		}

		return {
			key: item.decisionInstanceKey,
			decisionId: item.decisionDefinitionId,
			decisionName: item.decisionDefinitionName,
			decisionVersion: item.decisionDefinitionVersion,
			decisionType: item.decisionType,
			state: item.state,
			result: parsedResult,
			input: parsedInput,
			processInstanceKey: item.processInstanceKey,
			processDefinitionKey: item.processDefinitionKey,
			evaluationDate: item.evaluationDate,
			evaluationFailure: item.evaluationFailure,
			tenantId: item.tenantId,
		}
	}

	private deepEqual(obj1: unknown, obj2: unknown): boolean {
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

	/**
	 * Checks if the actual input contains all the key-value pairs from expected input.
	 * This allows for partial matching where expected input can be a subset of actual input.
	 */
	private containsInput(actualInput: unknown, expectedInput: unknown): boolean {
		if (!actualInput || !expectedInput) return false

		if (typeof expectedInput !== 'object') {
			return this.deepEqual(actualInput, expectedInput)
		}

		// Check if all expected key-value pairs exist in actual input
		return Object.entries(expectedInput).every(([key, value]) => {
			const actualValue = (actualInput as Record<string, unknown>)[key]
			if (typeof value === 'object' && value !== null) {
				return this.containsInput(actualValue, value)
			}
			return this.deepEqual(actualValue, value)
		})
	}
}
