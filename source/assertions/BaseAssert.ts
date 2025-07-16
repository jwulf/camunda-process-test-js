import { CamundaRestClient } from '@camunda8/sdk'

import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'

/**
 * Base class for all assertion types.
 * Provides common functionality like waiting with timeout.
 */
export abstract class BaseAssert {
	protected client: CamundaRestClient
	constructor(
		protected context: CamundaProcessTestContext,
		protected timeout: number,
		protected interval: number
	) {
		this.client = context.getClient().getCamundaRestClient()
	}

	/**
	 * Waits until a condition is met or timeout is reached.
	 * Uses exponential backoff to reduce API pressure.
	 * Accounts for operation duration to prevent overlapping calls.
	 */
	protected async waitUntil(
		condition: () => Promise<boolean> | boolean,
		description: string
	): Promise<void> {
		const startTime = Date.now()
		let currentInterval = this.interval
		let consecutiveErrors = 0

		while (Date.now() - startTime < this.timeout) {
			const operationStartTime = Date.now()

			try {
				if (await condition()) {
					return
				}
				// Reset error count on successful condition check
				consecutiveErrors = 0
				currentInterval = this.interval
			} catch (error) {
				consecutiveErrors++
				// Exponential backoff on consecutive errors (max 5 seconds)
				currentInterval = Math.min(
					this.interval * Math.pow(2, consecutiveErrors),
					5000
				)
			}

			// Calculate how long the operation took
			const operationDuration = Date.now() - operationStartTime

			// Only sleep if we have time remaining in the interval
			// This prevents overlapping calls and maintains consistent polling frequency
			const remainingInterval = Math.max(0, currentInterval - operationDuration)

			if (remainingInterval > 0) {
				await this.sleep(remainingInterval)
			}
			// If operation took longer than interval, we proceed immediately to next check
		}

		throw new Error(
			`Timeout waiting for ${description} after ${this.timeout}ms`
		)
	}

	/**
	 * Sleeps for the specified number of milliseconds.
	 */
	protected sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Gets the test context.
	 */
	protected getContext(): CamundaProcessTestContext {
		return this.context
	}
}
