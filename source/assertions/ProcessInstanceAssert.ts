import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext';
import { ElementSelector, ProcessInstanceSelector } from '../types';
import { BaseAssert } from './BaseAssert';

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
    super(context, timeout, interval);
  }

  /**
   * Asserts that the process instance is completed.
   */
  async isCompleted(): Promise<this> {
    await this.waitUntil(
      async () => {
        const instance = await this.getProcessInstance();
        return instance?.state === 'COMPLETED';
      },
      'Process instance to be completed'
    );
    return this;
  }

  /**
   * Asserts that the process instance is active (running).
   */
  async isActive(): Promise<this> {
    await this.waitUntil(
      async () => {
        const instance = await this.getProcessInstance();
        return instance?.state === 'ACTIVE';
      },
      'Process instance to be active'
    );
    return this;
  }

  /**
   * Asserts that the process instance is terminated.
   */
  async isTerminated(): Promise<this> {
    await this.waitUntil(
      async () => {
        const instance = await this.getProcessInstance();
        return instance?.state === 'TERMINATED';
      },
      'Process instance to be terminated'
    );
    return this;
  }

  /**
   * Asserts that specific elements have been completed.
   */
  async hasCompletedElements(...elementIds: string[]): Promise<this> {
    for (const elementId of elementIds) {
      await this.waitUntil(
        async () => {
          const elements = await this.getCompletedElements();
          return elements.some(el => el.elementId === elementId);
        },
        `Element '${elementId}' to be completed`
      );
    }
    return this;
  }

  /**
   * Asserts that specific elements are currently active.
   */
  async hasActiveElements(...elementIds: string[]): Promise<this> {
    for (const elementId of elementIds) {
      await this.waitUntil(
        async () => {
          const elements = await this.getActiveElements();
          return elements.some(el => el.elementId === elementId);
        },
        `Element '${elementId}' to be active`
      );
    }
    return this;
  }

  /**
   * Asserts that the process instance has specific variables.
   */
  async hasVariables(expectedVariables: Record<string, any>): Promise<this> {
    await this.waitUntil(
      async () => {
        const variables = await this.getProcessVariables();
        return Object.entries(expectedVariables).every(
          ([key, value]) => variables[key] === value
        );
      },
      `Process to have variables: ${JSON.stringify(expectedVariables)}`
    );
    return this;
  }

  /**
   * Asserts that the process instance has specific variable names.
   */
  async hasVariableNames(...variableNames: string[]): Promise<this> {
    await this.waitUntil(
      async () => {
        const variables = await this.getProcessVariables();
        return variableNames.every(name => name in variables);
      },
      `Process to have variable names: ${variableNames.join(', ')}`
    );
    return this;
  }

  /**
   * Asserts that the process instance has an incident.
   */
  async hasIncident(): Promise<this> {
    await this.waitUntil(
      async () => {
        const incidents = await this.getIncidents();
        return incidents.length > 0;
      },
      'Process instance to have an incident'
    );
    return this;
  }

  /**
   * Asserts that the process instance has no incidents.
   */
  async hasNoIncidents(): Promise<this> {
    await this.waitUntil(
      async () => {
        const incidents = await this.getIncidents();
        return incidents.length === 0;
      },
      'Process instance to have no incidents'
    );
    return this;
  }

  /**
   * Asserts that the process instance has an incident with a specific error message.
   */
  async hasIncidentWithMessage(errorMessage: string): Promise<this> {
    await this.waitUntil(
      async () => {
        const incidents = await this.getIncidents();
        return incidents.some(incident => incident.errorMessage?.includes(errorMessage));
      },
      `Process instance to have incident with message containing: ${errorMessage}`
    );
    return this;
  }

  // ======== Helper methods ========

  private async getProcessInstance(): Promise<any> {
    // In a real implementation, this would query the Zeebe/Elasticsearch API
    // For now, return mock data
    const key = typeof this.processInstanceKey === 'string' 
      ? this.processInstanceKey 
      : 'mock-key';
    
    return {
      key,
      state: 'COMPLETED', // Mock state
      variables: {},
      processDefinitionKey: 'mock-process-def'
    };
  }

  private async getCompletedElements(): Promise<any[]> {
    // Mock implementation - would query actual element instances
    return [
      { elementId: 'task1', state: 'COMPLETED' },
      { elementId: 'task2', state: 'COMPLETED' }
    ];
  }

  private async getActiveElements(): Promise<any[]> {
    // Mock implementation - would query actual element instances
    return [
      { elementId: 'active-task', state: 'ACTIVE' }
    ];
  }

  private async getProcessVariables(): Promise<Record<string, any>> {
    // Mock implementation - would query actual process variables
    return {
      testVar: 'testValue',
      number: 42
    };
  }

  private async getIncidents(): Promise<any[]> {
    // Mock implementation - would query actual incidents
    return [];
  }
}
