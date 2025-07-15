import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'
import {
	ProcessInstanceEvent,
	ProcessInstanceResult,
	ProcessInstanceSelector,
	UserTaskSelector,
	DecisionSelector,
	ElementSelector,
} from '../types'

import { ProcessInstanceAssert } from './ProcessInstanceAssert'
import { UserTaskAssert } from './UserTaskAssert'
import { DecisionInstanceAssert } from './DecisionInstanceAssert'
import { ElementSelectors } from './selectors'

/**
 * Entry point for all Camunda process assertions.
 * Provides fluent API for verifying process execution results.
 */
export class CamundaAssert {
	/** Default timeout for assertion polling */
	public static readonly DEFAULT_ASSERTION_TIMEOUT = 10000

	/** Default interval between assertion attempts */
	public static readonly DEFAULT_ASSERTION_INTERVAL = 100

	/** Default element selector function */
	public static readonly DEFAULT_ELEMENT_SELECTOR = ElementSelectors.byId

	private static context?: CamundaProcessTestContext
	private static assertionTimeout = CamundaAssert.DEFAULT_ASSERTION_TIMEOUT
	private static assertionInterval = CamundaAssert.DEFAULT_ASSERTION_INTERVAL
	private static elementSelector = CamundaAssert.DEFAULT_ELEMENT_SELECTOR

	// ======== Configuration ========

	/**
	 * Sets the timeout for assertion polling.
	 */
	static setAssertionTimeout(timeout: number): void {
		CamundaAssert.assertionTimeout = timeout
	}

	/**
	 * Sets the interval between assertion attempts.
	 */
	static setAssertionInterval(interval: number): void {
		CamundaAssert.assertionInterval = interval
	}

	/**
	 * Sets the default element selector function.
	 */
	static setElementSelector(selector: (id: string) => ElementSelector): void {
		CamundaAssert.elementSelector = selector
	}

	/**
	 * Gets the current assertion timeout.
	 */
	static getAssertionTimeout(): number {
		return CamundaAssert.assertionTimeout
	}

	/**
	 * Gets the current assertion interval.
	 */
	static getAssertionInterval(): number {
		return CamundaAssert.assertionInterval
	}

	// ======== Assertions ========

	/**
	 * Asserts on a process instance using the process instance event.
	 */
	static assertThat(
		processInstance: ProcessInstanceEvent
	): ProcessInstanceAssert {
		return new ProcessInstanceAssert(
			CamundaAssert.getContext(),
			processInstance.processInstanceKey,
			CamundaAssert.elementSelector,
			CamundaAssert.assertionTimeout,
			CamundaAssert.assertionInterval
		)
	}

	/**
	 * Asserts on a process instance using the process instance result.
	 */
	static assertThatResult(
		processResult: ProcessInstanceResult
	): ProcessInstanceAssert {
		return new ProcessInstanceAssert(
			CamundaAssert.getContext(),
			processResult.processInstanceKey,
			CamundaAssert.elementSelector,
			CamundaAssert.assertionTimeout,
			CamundaAssert.assertionInterval
		)
	}

	/**
	 * Asserts on a process instance using a selector.
	 */
	static assertThatProcess(
		selector: ProcessInstanceSelector
	): ProcessInstanceAssert {
		return new ProcessInstanceAssert(
			CamundaAssert.getContext(),
			selector,
			CamundaAssert.elementSelector,
			CamundaAssert.assertionTimeout,
			CamundaAssert.assertionInterval
		)
	}

	/**
	 * Asserts on a user task using a selector.
	 */
	static assertThatUserTask(selector: UserTaskSelector): UserTaskAssert {
		return new UserTaskAssert(
			CamundaAssert.getContext(),
			selector,
			CamundaAssert.assertionTimeout,
			CamundaAssert.assertionInterval
		)
	}

	/**
	 * Asserts on a decision instance using a selector.
	 */
	static assertThatDecision(
		selector: DecisionSelector
	): DecisionInstanceAssert {
		return new DecisionInstanceAssert(
			CamundaAssert.getContext(),
			selector,
			CamundaAssert.assertionTimeout,
			CamundaAssert.assertionInterval
		)
	}

	// ======== Internal ========

	/**
	 * Initializes the assertion context. Called by the test extension.
	 */
	static initialize(context: CamundaProcessTestContext): void {
		CamundaAssert.context = context
	}

	/**
	 * Resets the assertion context. Called by the test extension.
	 */
	static reset(): void {
		CamundaAssert.context = undefined
	}

	private static getContext(): CamundaProcessTestContext {
		if (!CamundaAssert.context) {
			throw new Error(
				'CamundaAssert context not initialized. Make sure you are running inside a test with @CamundaProcessTest'
			)
		}
		return CamundaAssert.context
	}
}
