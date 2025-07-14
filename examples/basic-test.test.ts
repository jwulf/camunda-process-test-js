/**
 * Example test demonstrating basic usage of Camunda Process Test Node.js
 */

import { Camunda8 } from "@camunda8/sdk";
import {
  CamundaProcessTest,
  CamundaAssert,
  CamundaProcessTestContext,
  ElementSelectors,
  setupCamundaProcessTest,
} from "../source";

// Using the decorator approach
@CamundaProcessTest
class MyProcessTest {
  // These will be automatically injected by the decorator
  private client!: Camunda8;
  private context!: CamundaProcessTestContext;

  async testSimpleProcess() {
    // Deploy process
    await this.context.deployProcess("./resources/simple-process.bpmn");

    // Start process instance
    const zeebe = this.client.getCamundaRestClient();
    const processInstance = await zeebe.createProcessInstance({
      processDefinitionId: "simple-process",
      variables: { input: "test-data" },
    });

    // Set up job worker mocks
    await this.context
      .mockJobWorker("process-data")
      .thenComplete({ output: "processed-data" });

    // Verify process completion
    const assertion = await CamundaAssert.assertThat(processInstance);
    await assertion.isCompleted();
    await assertion.hasCompletedElements(
      "start-event",
      "process-task",
      "end-event"
    );
    await assertion.hasVariables({ output: "processed-data" });
  }

  async testProcessWithUserTask() {
    // Deploy process with user task
    await this.context.deployProcess("./resources/user-task-process.bpmn");

    // Start process instance
    const zeebe = this.client.getZeebeGrpcApiClient();
    const processInstance = await zeebe.createProcessInstance({
      bpmnProcessId: "user-task-process",
      variables: { requestor: "john.doe" },
    });

    // Verify user task is created
    const userTaskAssertion = await CamundaAssert.assertThatUserTask({
      type: "elementId",
      value: "approve-request",
    });
    await userTaskAssertion.exists();
    await userTaskAssertion.isUnassigned();
    await userTaskAssertion.hasCandidateGroups("managers");
    await userTaskAssertion.complete({ approved: true });

    // Verify process completion
    const processAssertion = await CamundaAssert.assertThat(processInstance);
    await processAssertion.isCompleted();
    await processAssertion.hasVariables({ approved: true });
  }

  async testProcessWithDecision() {
    // Deploy process and decision
    await this.context.deployProcess("./resources/decision-process.bpmn");
    await this.context.deployDecision("./resources/approval-decision.dmn");

    // Start process instance
    const zeebe = this.client.getZeebeGrpcApiClient();
    const processInstance = await zeebe.createProcessInstance({
      bpmnProcessId: "decision-process",
      variables: { amount: 5000, requestor: "manager" },
    });

    // Verify decision was evaluated
    const decisionAssertion = await CamundaAssert.assertThatDecision({
      type: "decisionId",
      value: "approval-decision",
    });
    await decisionAssertion.wasEvaluated();
    await decisionAssertion.hasResult({
      approved: true,
      reason: "Auto-approved for manager",
    });
    await decisionAssertion.belongsToProcessInstance(
      processInstance.processInstanceKey
    );

    // Verify process completion
    const processAssertion2 = await CamundaAssert.assertThat(processInstance);
    await processAssertion2.isCompleted();
    await processAssertion2.hasVariables({ approved: true });
  }

  async testErrorHandling() {
    // Deploy process
    await this.context.deployProcess("./resources/error-process.bpmn");

    // Set up job worker to throw BPMN error
    this.context
      .mockJobWorker("risky-task")
      .thenThrowBpmnError("BUSINESS_ERROR", "Something went wrong")

    // Start process instance
    const zeebe = this.client.getZeebeGrpcApiClient();
    const processInstance = await zeebe.createProcessInstance({
      bpmnProcessId: "error-process",
      variables: {},
    });

    // Verify error boundary event was triggered
    const errorAssertion = await CamundaAssert.assertThat(processInstance);
    await errorAssertion.isCompleted();
    await errorAssertion.hasCompletedElements(
      "error-boundary-event",
      "handle-error-task"
    );
  }

  async testTimeBasedProcess() {
    // Deploy process with timer
    await this.context.deployProcess("./resources/timer-process.bpmn");

    // Start process instance
    const zeebe = this.client.getZeebeGrpcApiClient();
    const processInstance = await zeebe.createProcessInstance({
      bpmnProcessId: "timer-process",
      variables: {},
    });

    // Verify process is waiting at timer
    const timerAssertion1 = await CamundaAssert.assertThat(processInstance);
    await timerAssertion1.isActive();
    await timerAssertion1.hasActiveElements("wait-timer");

    // Advance time by 1 hour
    this.context.increaseTime({ hours: 1 });

    // Verify timer triggered and process completed
    const timerAssertion2 = await CamundaAssert.assertThat(processInstance);
    await timerAssertion2.isCompleted();
    await timerAssertion2.hasCompletedElements(
      "wait-timer",
      "after-timer-task"
    );
  }
}

// Using the function approach (alternative to decorator)
describe("Camunda Process Test - Function Approach", () => {
  // Setup must be called at module level, not inside beforeAll
  const setup = setupCamundaProcessTest();
  const client = setup.getClient();
  const context = setup.getContext();

  test("should complete simple process", async () => {
    // Deploy and test process
    await context.deployProcess("./resources/simple-process.bpmn");

    const zeebe = client.getZeebeGrpcApiClient();
    const processInstance = await zeebe.createProcessInstance({
      bpmnProcessId: "simple-process",
      variables: { test: true },
    });

    context
      .mockJobWorker("simple-task")
      .thenComplete({ result: "success" });

    const functionAssertion = await CamundaAssert.assertThat(processInstance);
    await functionAssertion.isCompleted();
    await functionAssertion.hasVariables({ result: "success" });
  });

  test("should handle multiple job workers", async () => {
    await context.deployProcess("./resources/multi-task-process.bpmn");

    // Set up multiple job workers with different behaviors
    context.mockJobWorker("task-1").thenComplete({ step1: "done" });
    context.mockJobWorker("task-2").thenComplete({ step2: "done" });
    context
      .mockJobWorker("task-3")
      .withHandler(async (job, complete) => {
        // Custom handler
        const variables = { step3: "custom-completion", jobKey: job.key };
        await complete.success(variables);
      })

    const zeebe = client.getZeebeGrpcApiClient();
    const processInstance = await zeebe.createProcessInstance({
      bpmnProcessId: "multi-task-process",
      variables: {},
    });

    const multiTaskAssertion = await CamundaAssert.assertThat(processInstance);
    await multiTaskAssertion.isCompleted();
    await multiTaskAssertion.hasVariables({
      step1: "done",
      step2: "done",
      step3: "custom-completion",
    });
  });
});

export { MyProcessTest };
