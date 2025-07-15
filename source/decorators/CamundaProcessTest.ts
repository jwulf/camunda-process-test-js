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
	return class extends constructor {
		_camundaExtension = new CamundaProcessTestExtension()

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		constructor(...args: any[]) {
			super(...args)

			// Set up test hooks
			this.setupTestHooks()
		}

		setupTestHooks() {
			// Jest setup/teardown hooks
			beforeAll(async () => {
				await this._camundaExtension.beforeAll()

				// Inject client and context
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				;(this as any).client = this._camundaExtension.getClient()
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				;(this as any).context = this._camundaExtension.getContext()
			})

			beforeEach(async () => {
				await this._camundaExtension.beforeEach()
			})

			afterEach(async () => {
				await this._camundaExtension.afterEach()
			})

			afterAll(async () => {
				await this._camundaExtension.afterAll()
			})
		}
	}
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
