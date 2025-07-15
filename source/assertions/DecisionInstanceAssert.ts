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

	private async getDecisionInstance(): Promise<any> {
		// Mock implementation - would query actual decision instances from Zeebe/Operate API
		if (this.selector.type === 'key') {
			return {
				key: this.selector.value,
				decisionId: 'test-decision',
				decisionName: 'Test Decision',
				state: 'EVALUATED',
				result: { output: 'approved' },
				input: { amount: 1000 },
				processInstanceKey: '12345',
			}
		}

		if (this.selector.type === 'decisionId') {
			return {
				key: 'decision-instance-key',
				decisionId: this.selector.value,
				decisionName: 'Test Decision',
				state: 'EVALUATED',
				result: { output: 'approved' },
				input: { amount: 1000 },
			}
		}

		return null
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
