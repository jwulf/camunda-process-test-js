import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext';
import { UserTaskSelector } from '../types';
import { BaseAssert } from './BaseAssert';

/**
 * Assertions for user tasks.
 * Provides fluent API for verifying user task state and properties.
 */
export class UserTaskAssert extends BaseAssert {
  constructor(
    context: CamundaProcessTestContext,
    private selector: UserTaskSelector,
    timeout: number,
    interval: number
  ) {
    super(context, timeout, interval);
  }

  /**
   * Asserts that the user task exists and is active.
   */
  async exists(): Promise<this> {
    await this.waitUntil(
      async () => {
        const task = await this.getUserTask();
        return task !== null;
      },
      'User task to exist'
    );
    return this;
  }

  /**
   * Asserts that the user task is assigned to a specific user.
   */
  async isAssignedTo(assignee: string): Promise<this> {
    await this.waitUntil(
      async () => {
        const task = await this.getUserTask();
        return task?.assignee === assignee;
      },
      `User task to be assigned to ${assignee}`
    );
    return this;
  }

  /**
   * Asserts that the user task is not assigned to any user.
   */
  async isUnassigned(): Promise<this> {
    await this.waitUntil(
      async () => {
        const task = await this.getUserTask();
        return !task?.assignee;
      },
      'User task to be unassigned'
    );
    return this;
  }

  /**
   * Asserts that the user task has specific candidate groups.
   */
  async hasCandidateGroups(...groups: string[]): Promise<this> {
    await this.waitUntil(
      async () => {
        const task = await this.getUserTask();
        return groups.every(group => 
          task?.candidateGroups?.includes(group)
        );
      },
      `User task to have candidate groups: ${groups.join(', ')}`
    );
    return this;
  }

  /**
   * Asserts that the user task has specific variables.
   */
  async hasVariables(expectedVariables: Record<string, any>): Promise<this> {
    await this.waitUntil(
      async () => {
        const task = await this.getUserTask();
        return Object.entries(expectedVariables).every(
          ([key, value]) => task?.variables[key] === value
        );
      },
      `User task to have variables: ${JSON.stringify(expectedVariables)}`
    );
    return this;
  }

  /**
   * Asserts that the user task has been completed.
   */
  async isCompleted(): Promise<this> {
    await this.waitUntil(
      async () => {
        const task = await this.getUserTask();
        return task?.state === 'COMPLETED';
      },
      'User task to be completed'
    );
    return this;
  }

  /**
   * Completes the user task with the specified variables.
   */
  async complete(variables: Record<string, any> = {}): Promise<this> {
    const task = await this.getUserTask();
    if (!task) {
      throw new Error('Cannot complete user task: task not found');
    }

    // In a real implementation, this would call the Zeebe API to complete the task
    // For now, we'll just simulate it
    console.log(`Completing user task ${task.key} with variables:`, variables);
    
    return this;
  }

  /**
   * Assigns the user task to a specific user.
   */
  async assignTo(assignee: string): Promise<this> {
    const task = await this.getUserTask();
    if (!task) {
      throw new Error('Cannot assign user task: task not found');
    }

    // In a real implementation, this would call the Zeebe API to assign the task
    console.log(`Assigning user task ${task.key} to ${assignee}`);
    
    return this;
  }

  // ======== Helper methods ========

  private async getUserTask(): Promise<any> {
    // Mock implementation - would query actual user tasks from Zeebe/Tasklist API
    if (this.selector.type === 'key') {
      return {
        key: this.selector.value,
        elementId: 'user-task-1',
        assignee: null,
        candidateGroups: ['group1', 'group2'],
        variables: { taskVar: 'value' },
        state: 'ACTIVE'
      };
    }
    
    return null;
  }
}
