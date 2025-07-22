import { Camunda8 } from '@camunda8/sdk'

export interface ProcessInstanceEvent {
	processInstanceKey: string
	processDefinitionKey: string
	version?: number
}

export interface ProcessInstanceResult extends ProcessInstanceEvent {
	variables: Record<string, unknown>
}

export interface UserTask {
	key: string
	processInstanceKey: string
	elementId: string
	assignee?: string
	candidateGroups?: string[]
	variables: Record<string, unknown>
}

export interface DecisionInstance {
	key: string
	decisionId: string
	decisionName: string
	processInstanceKey?: string
	result: unknown
}

export interface CamundaRuntimeConfiguration {
	camundaDockerImageName?: string
	camundaDockerImageVersion?: string
	camundaEnvVars?: Record<string, string>
	camundaExposedPorts?: number[]
	connectorsEnabled?: boolean
	connectorsDockerImageName?: string
	connectorsDockerImageVersion?: string
	connectorsEnvVars?: Record<string, string>
	connectorsSecrets?: Record<string, string>
	runtimeMode?: 'MANAGED' | 'REMOTE'
	remote?: {
		gatewayAddress?: string
		camundaMonitoringApiAddress?: string
		connectorsRestApiAddress?: string
	}
}

export interface CamundaTestClient {
	camunda: Camunda8
	processInstanceKey?: string
}

export type ElementSelector = {
	type: 'id' | 'name' | 'type' | 'custom'
	value: string | ((element: unknown) => boolean)
}

export type ProcessInstanceSelector = {
	type: 'key' | 'processId' | 'custom'
	value: string | ((instance: unknown) => boolean)
}

export type UserTaskSelector = {
	type: 'key' | 'elementId' | 'assignee' | 'custom'
	value: string | ((task: unknown) => boolean)
}

export type DecisionSelector = {
	type: 'key' | 'decisionId' | 'processInstanceKey' | 'custom'
	value: string | ((decision: unknown) => boolean)
}
