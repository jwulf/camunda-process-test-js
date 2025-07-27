import Debug from 'debug'

import { CamundaProcessTestRuntime } from './CamundaProcessTestRuntime'

const clockWarn = Debug('camunda:test:clock')
clockWarn.enabled = true

/**
 * Utility class for managing Zeebe's clock in test environments.
 * Uses the undocumented /actuator/clock REST API endpoints.
 * Properly handles container host resolution for cross-platform compatibility.
 *
 * ⚠️  IMPORTANT: Clock manipulation may fail in REMOTE mode (SaaS/C8Run environments).
 * For reliable timer testing, use MANAGED mode with Docker containers.
 */
export class CamundaClock {
	private readonly managementBaseUrl: string

	constructor(private readonly runtime: CamundaProcessTestRuntime) {
		const managementBaseAddress = runtime.getMonitoringApiAddress()
		this.managementBaseUrl = `${managementBaseAddress}/actuator/clock`
	}

	/**
	 * Get the current clock time from Zeebe
	 */
	async getCurrentTime(): Promise<Date> {
		const response = await fetch(this.managementBaseUrl)
		if (!response.ok) {
			throw new Error(
				`Failed to get current time: ${response.status} ${response.statusText}`
			)
		}
		const data = await response.json()
		return new Date(data.epochMilli)
	}

	/**
	 * Advance the clock by the specified number of milliseconds.
	 *
	 * ⚠️  Warning: May fail in REMOTE mode (SaaS/C8Run). Use MANAGED mode for reliable timer testing.
	 */
	async addTime(offsetMillis: number): Promise<void> {
		const runtimeMode = this.runtime.getRuntimeMode()
		if (runtimeMode === 'REMOTE') {
			clockWarn(
				'⚠️  REMOTE mode: Clock manipulation may fail on SaaS/C8Run. Consider using MANAGED mode for timer tests.'
			)
		}

		try {
			const response = await fetch(`${this.managementBaseUrl}/add`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ offsetMilli: offsetMillis }),
			})

			if (!response.ok) {
				throw new Error(
					`Failed to advance clock: ${response.status} ${response.statusText}`
				)
			}
		} catch (error) {
			if (runtimeMode === 'REMOTE') {
				throw new Error(
					`❌ Clock manipulation failed in REMOTE mode. SaaS and C8Run environments typically reject clock changes. Use MANAGED mode (Docker containers) for reliable timer testing. Original error: ${error}`
				)
			}
			throw error
		}
	}

	/**
	 * Reset the clock to the system time.
	 *
	 * ⚠️  Warning: May fail in REMOTE mode (SaaS/C8Run). Use MANAGED mode for reliable timer testing.
	 */
	async resetClock(): Promise<void> {
		const runtimeMode = this.runtime.getRuntimeMode()
		if (runtimeMode === 'REMOTE') {
			clockWarn(
				'⚠️  REMOTE mode: Clock reset may fail on SaaS/C8Run. Consider using MANAGED mode for timer tests.'
			)
		}

		try {
			const response = await fetch(this.managementBaseUrl, {
				method: 'DELETE',
			})

			if (!response.ok) {
				throw new Error(
					`Failed to reset clock: ${response.status} ${response.statusText}`
				)
			}
		} catch (error) {
			if (runtimeMode === 'REMOTE') {
				throw new Error(
					`❌ Clock reset failed in REMOTE mode. SaaS and C8Run environments typically reject clock changes. Use MANAGED mode (Docker containers) for reliable timer testing. Original error: ${error}`
				)
			}
			throw error
		}
	}

	/**
	 * Advance the clock by the specified duration.
	 * Supports common time units.
	 *
	 * ⚠️  Warning: May fail in REMOTE mode (SaaS/C8Run). Use MANAGED mode for reliable timer testing.
	 */
	async advanceTime(
		amount: number,
		unit:
			| 'milliseconds'
			| 'seconds'
			| 'minutes'
			| 'hours'
			| 'days' = 'milliseconds'
	): Promise<void> {
		const runtimeMode = this.runtime.getRuntimeMode()
		if (runtimeMode === 'REMOTE') {
			clockWarn(
				`⚠️  REMOTE mode: Advancing clock by ${amount} ${unit} may fail on SaaS/C8Run. Consider using MANAGED mode for timer tests.`
			)
		}

		let milliseconds = amount

		switch (unit) {
			case 'seconds':
				milliseconds = amount * 1000
				break
			case 'minutes':
				milliseconds = amount * 60 * 1000
				break
			case 'hours':
				milliseconds = amount * 60 * 60 * 1000
				break
			case 'days':
				milliseconds = amount * 24 * 60 * 60 * 1000
				break
		}

		await this.addTime(milliseconds)
	}
}
