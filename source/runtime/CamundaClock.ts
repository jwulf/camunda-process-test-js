import { CamundaProcessTestRuntime } from './CamundaProcessTestRuntime'

/**
 * Utility class for managing Zeebe's clock in test environments.
 * Uses the undocumented /actuator/clock REST API endpoints.
 * Properly handles container host resolution for cross-platform compatibility.
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
	 * Advance the clock by the specified number of milliseconds
	 */
	async addTime(offsetMillis: number): Promise<void> {
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
	}

	/**
	 * Reset the clock to the system time
	 */
	async resetClock(): Promise<void> {
		const response = await fetch(this.managementBaseUrl, {
			method: 'DELETE',
		})

		if (!response.ok) {
			throw new Error(
				`Failed to reset clock: ${response.status} ${response.statusText}`
			)
		}
	}

	/**
	 * Advance the clock by the specified duration.
	 * Supports common time units.
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
