import { Camunda8 } from '@camunda8/sdk';

export interface ProcessInstanceEvent {
  processInstanceKey: string;
  processDefinitionKey: string;
  version: number;
}

export interface ProcessInstanceResult extends ProcessInstanceEvent {
  variables: Record<string, any>;
}

export interface UserTask {
  key: string;
  processInstanceKey: string;
  elementId: string;
  assignee?: string;
  candidateGroups?: string[];
  variables: Record<string, any>;
}

export interface DecisionInstance {
  key: string;
  decisionId: string;
  decisionName: string;
  processInstanceKey?: string;
  result: any;
}

export interface CamundaRuntimeConfiguration {
  camundaDockerImageName?: string;
  camundaDockerImageVersion?: string;
  camundaEnvVars?: Record<string, string>;
  camundaExposedPorts?: number[];
  connectorsEnabled?: boolean;
  connectorsDockerImageName?: string;
  connectorsDockerImageVersion?: string;
  connectorsEnvVars?: Record<string, string>;
  connectorsSecrets?: Record<string, string>;
  runtimeMode?: 'MANAGED' | 'REMOTE';
  remote?: {
    gatewayAddress?: string;
    camundaMonitoringApiAddress?: string;
    connectorsRestApiAddress?: string;
  };
}

export interface CamundaTestClient {
  zeebe: Camunda8;
  processInstanceKey?: string;
}

export type ElementSelector = {
  type: 'id' | 'name' | 'type' | 'custom';
  value: string | ((element: any) => boolean);
};

export type ProcessInstanceSelector = {
  type: 'key' | 'processId' | 'custom';
  value: string | ((instance: any) => boolean);
};

export type UserTaskSelector = {
  type: 'key' | 'elementId' | 'assignee' | 'custom';
  value: string | ((task: any) => boolean);
};

export type DecisionSelector = {
  type: 'key' | 'decisionId' | 'processInstanceKey' | 'custom';
  value: string | ((decision: any) => boolean);
};
