/* eslint-disable @typescript-eslint/no-explicit-any */

import Debug from 'debug'

import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'
import { ElementSelector, ProcessInstanceSelector } from '../types'

import { BaseAssert } from './BaseAssert'

const debug = Debug('camunda:test:assert:process-instance')

/**
 * Assertions for process instances.
 * Provides fluent API for verifying process execution state and progress.
 */
export class ProcessInstanceAssert extends BaseAssert {
	constructor(
		context: CamundaProcessTestContext,
		private processInstanceKey: string | ProcessInstanceSelector,
		private elementSelector: (id: string) => ElementSelector,
		timeout: number,
		interval: number
	) {
		super(context, timeout, interval)
	}

	/**
	 * Asserts that the process instance is completed.
	 */
	async isCompleted(): Promise<this> {
		const processInstanceKey =
			typeof this.processInstanceKey === 'string'
				? this.processInstanceKey
				: (this.processInstanceKey.value as string)

		await this.waitUntil(async () => {
			const searchResult = await this.client.searchProcessInstances({
				filter: {
					processInstanceKey,
				},
				sort: [{ field: 'processInstanceKey', order: 'ASC' }],
				page: { from: 0, limit: 1 },
			})

			if (searchResult.items.length === 0) {
				return false
			}
			const instance = searchResult.items[0] as any
			return instance.state === 'COMPLETED'
		}, `Process instance ${processInstanceKey} to be completed`)

		return this
	}

	/**
	 * Asserts that the process instance is active (running).
	 */
	async isActive(): Promise<this> {
		const processInstanceKey =
			typeof this.processInstanceKey === 'string'
				? this.processInstanceKey
				: (this.processInstanceKey.value as string)

		await this.waitUntil(async () => {
			const searchResult = await this.client.searchProcessInstances({
				filter: {
					processInstanceKey,
				},
				sort: [{ field: 'processInstanceKey', order: 'ASC' }],
				page: { from: 0, limit: 1 },
			})

			if (searchResult.items.length === 0) {
				return false
			}
			const instance = searchResult.items[0] as any
			return instance.state === 'ACTIVE'
		}, `Process instance ${processInstanceKey} to be active`)

		return this
	}

	/**
	 * Asserts that the process instance is terminated.
	 */
	async isTerminated(): Promise<this> {
		const processInstanceKey =
			typeof this.processInstanceKey === 'string'
				? this.processInstanceKey
				: (this.processInstanceKey.value as string)

		await this.waitUntil(async () => {
			const searchResult = await this.client.searchProcessInstances({
				filter: {
					processInstanceKey,
				},
				sort: [{ field: 'processInstanceKey', order: 'ASC' }],
				page: { from: 0, limit: 1 },
			})

			if (searchResult.items.length === 0) {
				return false
			}
			const instance = searchResult.items[0] as any
			return instance.state === 'TERMINATED'
		}, `Process instance ${processInstanceKey} to be terminated`)

		return this
	}

	/**
	 * Asserts that specific elements have been completed.
	 */
	async hasCompletedElements(...elementIds: string[]): Promise<this> {
		for (const elementId of elementIds) {
			await this.waitUntil(async () => {
				const elements = await this.getCompletedElements()
				return elements.some((el) => el.elementId === elementId)
			}, `Element '${elementId}' to be completed`)
		}
		return this
	}

	/**
	 * Asserts that specific elements are currently active.
	 */
	async hasActiveElements(...elementIds: string[]): Promise<this> {
		for (const elementId of elementIds) {
			await this.waitUntil(async () => {
				const elements = await this.getActiveElements()
				return elements.some((el) => el.elementId === elementId)
			}, `Element '${elementId}' to be active`)
		}
		return this
	}

	/**
	 * Asserts that the process instance has specific variables.
	 */
	async hasVariables(expectedVariables: Record<string, any>): Promise<this> {
		debug(
			`Checking process instance ${this.processInstanceKey} for variables:`,
			expectedVariables
		)
		await this.waitUntil(
			async () => {
				debug(
					`Fetching variables for process instance ${this.processInstanceKey}`
				)
				const variables = await this.getProcessVariables()
				debug('**************************variables')
				debug(JSON.stringify(variables))
				return Object.entries(expectedVariables).every(
					([key, value]) => variables[key] === value
				)
			},
			`Process to have variables: ${JSON.stringify(expectedVariables)}`
		)
		return this
	}

	/**
	 * Asserts that the process instance has specific variable names.
	 */
	async hasVariableNames(...variableNames: string[]): Promise<this> {
		await this.waitUntil(
			async () => {
				const variables = await this.getProcessVariables()
				return variableNames.every((name) => name in variables)
			},
			`Process to have variable names: ${variableNames.join(', ')}`
		)
		return this
	}

	/**
	 * Asserts that the process instance has an incident.
	 */
	async hasIncident(): Promise<this> {
		await this.waitUntil(async () => {
			const incidents = await this.getIncidents()
			return incidents.length > 0
		}, 'Process instance to have an incident')
		return this
	}

	/**
	 * Asserts that the process instance has no incidents.
	 */
	async hasNoIncidents(): Promise<this> {
		await this.waitUntil(async () => {
			const incidents = await this.getIncidents()
			return incidents.length === 0
		}, 'Process instance to have no incidents')
		return this
	}

	/**
	 * Asserts that the process instance has an incident with a specific error message.
	 */
	async hasIncidentWithMessage(errorMessage: string): Promise<this> {
		await this.waitUntil(async () => {
			const incidents = await this.getIncidents()
			return incidents.some((incident) =>
				incident.errorMessage?.includes(errorMessage)
			)
		}, `Process instance to have incident with message containing: ${errorMessage}`)
		return this
	}

	// ======== Helper methods ========

	private async getProcessInstance(): Promise<any> {
		const processInstanceKey =
			typeof this.processInstanceKey === 'string'
				? this.processInstanceKey
				: (this.processInstanceKey.value as string)

		const searchResult = await this.client.searchProcessInstances({
			filter: {
				processInstanceKey,
			},
			sort: [{ field: 'processInstanceKey', order: 'ASC' }],
			page: { from: 0, limit: 1 },
		})

		if (searchResult.items.length === 0) {
			throw new Error(
				`Process instance with key ${processInstanceKey} not found`
			)
		}

		return searchResult.items[0]
	}

	private async getCompletedElements(): Promise<any[]> {
		return this.client
			.searchElementInstances({
				filter: {
					processInstanceKey:
						typeof this.processInstanceKey === 'string'
							? this.processInstanceKey
							: (this.processInstanceKey.value as string),
					state: 'COMPLETED',
				},
				sort: [{ field: 'elementInstanceKey', order: 'ASC' }],
				page: { from: 0, limit: 1000 },
			})
			.then((result) => result.items)
	}

	private async getActiveElements(): Promise<any[]> {
		return this.client
			.searchElementInstances({
				filter: {
					processInstanceKey:
						typeof this.processInstanceKey === 'string'
							? this.processInstanceKey
							: (this.processInstanceKey.value as string),
					state: 'ACTIVE',
				},
				sort: [{ field: 'elementInstanceKey', order: 'ASC' }],
				page: { from: 0, limit: 1000 },
			})
			.then((result) => result.items)
	}

	private async getProcessVariables(): Promise<Record<string, any>> {
		const processInstanceKey =
			typeof this.processInstanceKey === 'string'
				? this.processInstanceKey
				: (this.processInstanceKey.value as string)
		debug(
			`getProcessVariables: Fetching variables for process instance ${processInstanceKey}`
		)
		const result = await this.client.searchVariables({
			filter: {
				processInstanceKey,
			},
		})

		const variables = result.items.reduce(
			(acc, variable) => {
				acc[variable.name] = JSON.parse(variable.value) // TODO: remove 'as any' when type is defined
				return acc
			},
			{} as Record<string, any>
		)

		return variables
	}

	private async getIncidents(): Promise<any[]> {
		return this.client
			.searchIncidents({
				filter: {
					processInstanceKey:
						typeof this.processInstanceKey === 'string'
							? this.processInstanceKey
							: (this.processInstanceKey.value as string),
				},
				sort: [{ field: 'incidentKey', order: 'ASC' }],
				page: { from: 0, limit: 1000 },
			})
			.then((result) => result.items)
	}
}
