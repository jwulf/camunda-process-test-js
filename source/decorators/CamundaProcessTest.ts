import { Camunda8 } from '@camunda8/sdk'

import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext'

import { CamundaProcessTestExtension } from './CamundaProcessTestExtension'

/**
 * Decorator that marks a test class as a Camunda process test.
 *
 * Automatically sets up the Camunda runtime, injects the Zeebe client,
 * and manages test lifecycle.
 *
 * @example
 * ```typescript
 * @CamundaProcessTest
 * class MyProcessTest {
 *   private client: ZBClient; // Automatically injected
 *   private context: CamundaProcessTestContext; // Automatically injected
 *
 *   @Test
 *   async shouldCompleteProcess() {
 *     // given
 *     const processInstance = await this.client.createProcessInstance({
 *       bpmnProcessId: 'my-process',
 *       variables: { input: 'test' }
 *     });
 *
 *     // when
 *     // ... test logic
 *
 *     // then
 *     await CamundaAssert.assertThat(processInstance)
 *       .isCompleted()
 *       .hasCompletedElements('task1', 'task2');
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
export function CamundaProcessTest<T extends { new (...args: any[]): {} }>(
	constructor: T
) {
	const extension = new CamundaProcessTestExtension()

	// Inject client and context for the test methods
	// This will be set during beforeAll, but we need to defer it
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let client: Camunda8
	let context: CamundaProcessTestContext

	// Set up Jest lifecycle hooks immediately at module evaluation time
	beforeAll(async () => {
		await extension.beforeAll()
		client = extension.getClient()
		context = extension.getContext()
	})

	beforeEach(async () => {
		await extension.beforeEach()
	})

	afterEach(async () => {
		await extension.afterEach()
	})

	afterAll(async () => {
		await extension.afterAll()
	})

	// Create an instance to scan for test methods
	const instance = new constructor()

	// Get all method names from the instance
	const methodNames = Object.getOwnPropertyNames(
		Object.getPrototypeOf(instance)
	)

	// Filter for methods that start with 'test' and are functions
	const testMethods = methodNames.filter(
		(name) =>
			name.startsWith('test') &&
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			typeof (instance as any)[name] === 'function' &&
			name !== 'constructor'
	)

	// Register each test method with Jest immediately
	testMethods.forEach((methodName) => {
		test(methodName, async () => {
			// Inject client and context just before running the test
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			;(instance as any).client = client
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			;(instance as any).context = context

			// Execute the test method
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (instance as any)[methodName]()
		})
	})

	return constructor
}

/**
 * Alternative function-based approach for test setup
 */
export function setupCamundaProcessTest() {
	const extension = new CamundaProcessTestExtension()

	beforeAll(async () => {
		await extension.beforeAll()
	})

	beforeEach(async () => {
		await extension.beforeEach()
	})

	afterEach(async () => {
		await extension.afterEach()
	})

	afterAll(async () => {
		await extension.afterAll()
	})

	return {
		getClient: () => extension.getClient(),
		getContext: () => extension.getContext(),
	}
}
