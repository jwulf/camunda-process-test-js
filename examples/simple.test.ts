/**
 * Simple working example of Camunda Process Test
 */

import {
  CamundaAssert,
  setupCamundaProcessTest
} from '../source';

// Function approach - simpler to start with
const setup = setupCamundaProcessTest();

describe('Simple Camunda Process Test', () => {
  test('should deploy and run a simple process', async () => {
    const client = setup.getClient();
    const context = setup.getContext();
    process.stdout.write('Starting simple process test...\n');
    // Deploy process
    await context.deployProcess('./examples/resources/simple-process.bpmn');

    // Start process instance
    const zeebe = client.getCamundaRestClient();
    const processInstance = await zeebe.createProcessInstance({
      processDefinitionId: 'simple-process',
      variables: { input: 'test-data' }
    });

    // Mock the job worker
    await context.mockJobWorker('process-data')
      .thenComplete({ output: 'processed-data' });

    // Basic assertion
    const assertion = CamundaAssert.assertThat(processInstance);
    await assertion.isCompleted();
  }, 180000); // 3 minute timeout for container startup
});
