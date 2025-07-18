import { Camunda8 } from '@camunda8/sdk';
import Debug from 'debug';

const debug = Debug('camunda:test:jobworker');

type JobHandler = (job: any, complete: any) => Promise<void> | void;

/**
 * Mock job worker for testing process flows.
 * Provides easy configuration for different job completion scenarios.
 */
export class JobWorkerMock {
  private worker?: any;
  private handlers: JobHandler[] = [];
  private isStarted = false;
  private finish?: () => void;

  constructor(
    private client: Camunda8,
    private jobType: string
  ) {}

  /**
   * Configures the worker to complete jobs successfully with the given variables.
   */
  thenComplete<T = Record<string, any>>(variables?: T): Promise<void> {
    this.handlers.push(async (job, complete) => {
      debug(`Completing job ${job.key} of type ${this.jobType} with variables:`, variables);
      await complete.success(variables ?? {});
    });
    this.start();
    return new Promise((resolve) => this.finish = () => resolve(void 0));
  }

  /**
   * Configures the worker to fail jobs with the given error message.
   */
  thenThrowError(errorMessage: string, retries: number = 0): Promise<void> {
    this.handlers.push(async (job, complete) => {
      debug(`Failing job ${job.key} of type ${this.jobType} with error: ${errorMessage}`);
      await complete.failure(errorMessage, undefined, retries);
    });
    this.start()
    return new Promise((resolve) => this.finish = () => resolve(void 0));
  }

  /**
   * Configures the worker to throw a BPMN error with the given error code.
   */
  thenThrowBpmnError(errorCode: string, errorMessage?: string): Promise<void> {
    this.handlers.push(async (job, complete) => {
      debug(`Throwing BPMN error for job ${job.key} of type ${this.jobType}: ${errorCode}`);
      await complete.error(errorCode, errorMessage);
    });
    this.start()
    return new Promise((resolve) => this.finish = () => resolve(void 0));
  }

  /**
   * Configures the worker with a custom handler function.
   */
  withHandler(handler: JobHandler): Promise<void> {
    this.handlers.push(handler);
    this.start()
    return new Promise((resolve) => this.finish = () => resolve(void 0));
  }

  /**
   * Configures the worker to do nothing (jobs will timeout).
   */
  doNothing(): Promise<void> {
    this.handlers.push(() => {
      debug(`Ignoring job of type ${this.jobType} (will timeout)`);
      // Do nothing - job will timeout
    });
    return new Promise((resolve) => this.finish = () => resolve(void 0));
  }

  /**
   * Starts the job worker with the configured behavior.
   */
  private start(): void {
    if (this.isStarted) {
      return;
    }

    let handlerIndex = 0;

    const zeebe = this.client.getCamundaRestClient();
    this.worker = zeebe.createJobWorker({
      type: this.jobType,
      jobHandler: async (job) => {
        debug(`Processing job ${job.jobKey} of type ${this.jobType}`);
        this.worker.stop()
        const handler = this.handlers[handlerIndex % this.handlers.length];
        
        try {
          const complete = {
            success: (variables: Record<string, any> = {}) => job.complete(variables),
            failure: (errorMessage: string, errorDetails?: any, retries?: number) => 
              job.fail({ errorMessage, retryBackOff: retries || 0 }),
            error: (errorCode: string, errorMessage?: string) => 
              job.error({ errorCode, errorMessage, variables: {} })
          };
          await handler(job, complete);
          handlerIndex++;
          return 'JOB_ACTION_ACKNOWLEDGEMENT' as const;
        } catch (error) {
          debug(`Error in job handler for ${this.jobType}:`, error);
          job.fail({ errorMessage: `Handler error: ${error}` });
          handlerIndex++;
          return 'JOB_ACTION_ACKNOWLEDGEMENT' as const;
        } 
      },
      maxJobsToActivate: 1, // Process one job at a time
      timeout: 30000,
      worker: 'job-worker-mock',
    });

    this.isStarted = true;
    debug(`Started job worker for type: ${this.jobType}`);
  }

  /**
   * Stops the job worker.
   */
  stop(): void {
    if (this.worker && this.isStarted) {
      this.worker.stop();
      this.isStarted = false;
      debug(`Stopped job worker for type: ${this.jobType}`);
    }
  }


  /**
   * Gets the job type this worker handles.
   */
  getJobType(): string {
    return this.jobType;
  }

  /**
   * Checks if the worker is currently started.
   */
  isActive(): boolean {
    return this.isStarted;
  }
}
