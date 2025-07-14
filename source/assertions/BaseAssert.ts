import { CamundaProcessTestContext } from '../runtime/CamundaProcessTestContext';

/**
 * Base class for all assertion types.
 * Provides common functionality like waiting with timeout.
 */
export abstract class BaseAssert {
  constructor(
    protected context: CamundaProcessTestContext,
    protected timeout: number,
    protected interval: number
  ) {}

  /**
   * Waits until a condition is met or timeout is reached.
   */
  protected async waitUntil(
    condition: () => Promise<boolean> | boolean,
    description: string
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.timeout) {
      try {
        if (await condition()) {
          return;
        }
      } catch (error) {
        // Continue polling on errors
      }
      
      await this.sleep(this.interval);
    }
    
    throw new Error(`Timeout waiting for ${description} after ${this.timeout}ms`);
  }

  /**
   * Sleeps for the specified number of milliseconds.
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets the test context.
   */
  protected getContext(): CamundaProcessTestContext {
    return this.context;
  }
}
