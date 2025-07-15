import {
	ElementSelector,
	ProcessInstanceSelector,
	UserTaskSelector,
	DecisionSelector,
} from '../../types'

/**
 * Element selectors for targeting BPMN elements in assertions.
 */
export class ElementSelectors {
	/**
	 * Selects an element by its BPMN ID.
	 */
	static byId(id: string): ElementSelector {
		return { type: 'id', value: id }
	}

	/**
	 * Selects an element by its name.
	 */
	static byName(name: string): ElementSelector {
		return { type: 'name', value: name }
	}

	/**
	 * Selects an element by its BPMN type (e.g., 'userTask', 'serviceTask').
	 */
	static byType(type: string): ElementSelector {
		return { type: 'type', value: type }
	}

	/**
	 * Selects an element using a custom predicate function.
	 */
	static byCustom(predicate: (element: unknown) => boolean): ElementSelector {
		return { type: 'custom', value: predicate }
	}
}

/**
 * Process instance selectors for targeting process instances in assertions.
 */
export class ProcessInstanceSelectors {
	/**
	 * Selects a process instance by its key.
	 */
	static byKey(key: string): ProcessInstanceSelector {
		return { type: 'key', value: key }
	}

	/**
	 * Selects a process instance by its BPMN process ID.
	 */
	static byProcessId(processId: string): ProcessInstanceSelector {
		return { type: 'processId', value: processId }
	}

	/**
	 * Selects a process instance using a custom predicate function.
	 */
	static byCustom(
		predicate: (instance: unknown) => boolean
	): ProcessInstanceSelector {
		return { type: 'custom', value: predicate }
	}
}

/**
 * User task selectors for targeting user tasks in assertions.
 */
export class UserTaskSelectors {
	/**
	 * Selects a user task by its key.
	 */
	static byKey(key: string): UserTaskSelector {
		return { type: 'key', value: key }
	}

	/**
	 * Selects a user task by its element ID.
	 */
	static byElementId(elementId: string): UserTaskSelector {
		return { type: 'elementId', value: elementId }
	}

	/**
	 * Selects a user task by its assignee.
	 */
	static byAssignee(assignee: string): UserTaskSelector {
		return { type: 'assignee', value: assignee }
	}

	/**
	 * Selects a user task using a custom predicate function.
	 */
	static byCustom(predicate: (task: unknown) => boolean): UserTaskSelector {
		return { type: 'custom', value: predicate }
	}
}

/**
 * Decision selectors for targeting decision instances in assertions.
 */
export class DecisionSelectors {
	/**
	 * Selects a decision instance by its key.
	 */
	static byKey(key: string): DecisionSelector {
		return { type: 'key', value: key }
	}

	/**
	 * Selects a decision instance by its decision ID.
	 */
	static byDecisionId(decisionId: string): DecisionSelector {
		return { type: 'decisionId', value: decisionId }
	}

	/**
	 * Selects a decision instance by the process instance it belongs to.
	 */
	static byProcessInstanceKey(processInstanceKey: string): DecisionSelector {
		return { type: 'processInstanceKey', value: processInstanceKey }
	}

	/**
	 * Selects a decision instance using a custom predicate function.
	 */
	static byCustom(predicate: (decision: unknown) => boolean): DecisionSelector {
		return { type: 'custom', value: predicate }
	}

	/**
	 * Selects a decision instance from an evaluate decision response.
	 */
	static byResponse(response: Record<string, unknown>): DecisionSelector {
		return {
			type: 'key',
			value: (response.decisionInstanceKey || response.key) as string,
		}
	}
}

// Re-export for convenience
export {
	ElementSelector,
	ProcessInstanceSelector,
	UserTaskSelector,
	DecisionSelector,
}
