import { Camunda8, type CamundaRestApiTypes } from '@camunda8/sdk'

export interface ProcessInstanceEvent {
	processInstanceKey: string
	processDefinitionKey: string
	version?: number
}

export interface ProcessInstanceResult extends ProcessInstanceEvent {
	variables: Record<string, unknown>
}

// Re-export SDK types with our naming
export type UserTask = CamundaRestApiTypes.UserTask
export type ProcessInstance = CamundaRestApiTypes.ProcessInstanceDetails
export type DecisionInstance = CamundaRestApiTypes.GetDecisionInstanceResponse

// Legacy interface for backwards compatibility (deprecated)
/** @deprecated Use DecisionInstance from SDK instead */
export interface LegacyDecisionInstance {
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
	clusterType?: 'SAAS' | 'C8RUN' | 'SELF_MANAGED'
	// Remote connection properties
	zeebeClientId?: string
	zeebeClientSecret?: string
	camundaOauthUrl?: string
	zeebeRestAddress?: string
	zeebeGrpcAddress?: string
	zeebeTokenAudience?: string
	camundaAuthStrategy?: string
	camundaMonitoringApiAddress?: string
	connectorsRestApiAddress?: string
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
	value: string | ((instance: ProcessInstance) => boolean)
}

export type UserTaskSelector = {
	type: 'key' | 'elementId' | 'assignee' | 'custom'
	value: string | ((task: UserTask) => boolean)
}

export type DecisionSelector = {
	type: 'key' | 'decisionId' | 'processInstanceKey' | 'custom'
	value: string | ((decision: DecisionInstance) => boolean)
}
