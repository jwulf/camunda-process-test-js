/**
 * Test demonstrating gRPC worker functionality with the Camunda Process Test framework.
 * This test verifies that workers can connect to the Zeebe gRPC API to handle jobs.
 */

import * as fs from 'fs'
import * as path from 'path'

import Debug from 'debug'

import { CamundaAssert, setupCamundaProcessTest } from '../source'

const log = Debug('grpc-worker.test')
log.enabled = true // Enable logging output

const setup = setupCamundaProcessTest()

describe('gRPC Worker Test', () => {
	test('should connect gRPC worker and process job', async () => {
		const client = setup.getClient()
		const context = setup.getContext()

		// Define a simple BPMN process with a service task
		const bpmnProcess = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
    xmlns:zeebe="http://camunda.org/schema/zeebe/1.0" 
    id="test-process"
    targetNamespace="http://camunda.org/schema/1.0/bpmn">
  <bpmn:process id="grpc-worker-test" isExecutable="true">
    <bpmn:startEvent id="start">
      <bpmn:outgoing>to-task</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="test-task" name="Test Task">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="test-worker" />
      </bpmn:extensionElements>
      <bpmn:incoming>to-task</bpmn:incoming>
      <bpmn:outgoing>to-end</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="end">
      <bpmn:incoming>to-end</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="to-task" sourceRef="start" targetRef="test-task" />
    <bpmn:sequenceFlow id="to-end" sourceRef="test-task" targetRef="end" />
  </bpmn:process>
</bpmn:definitions>`

		// Save BPMN to a temporary file and deploy
		const bpmnPath = path.join(__dirname, 'resources', 'grpc-worker-test.bpmn')

		// Ensure directory exists
		const resourcesDir = path.dirname(bpmnPath)
		if (!fs.existsSync(resourcesDir)) {
			fs.mkdirSync(resourcesDir, { recursive: true })
		}

		fs.writeFileSync(bpmnPath, bpmnProcess)

		// Deploy the process using context
		await context.deployProcess(bpmnPath)

		// Track job completion
		let jobCompleted = false
		let jobData: Record<string, unknown> = {}

		// Use the framework's client - let's see what happens with explicit debugging
		log('🔍 About to create gRPC client...')
		const grpcClient = client.getZeebeGrpcApiClient()
		log('🔍 gRPC client created successfully')

		const worker = grpcClient.createWorker({
			taskType: 'test-worker',
			taskHandler: (job) => {
				log('🔧 Worker received job:', job.key)
				jobData = job.variables
				jobCompleted = true
				return job.complete({
					result: 'processed',
					timestamp: new Date().toISOString(),
				})
			},
		})

		try {
			// Start a process instance using REST API
			const camunda = client.getCamundaRestClient()
			const processInstance = await camunda.createProcessInstance({
				processDefinitionId: 'grpc-worker-test',
				variables: {
					testInput: 'hello world',
					counter: 42,
				},
			})

			log('📋 Started process instance:', processInstance.processInstanceKey)

			// Wait for the job to be completed
			const timeout = 10000 // 10 seconds
			const startTime = Date.now()
			while (!jobCompleted && Date.now() - startTime < timeout) {
				await new Promise((resolve) => setTimeout(resolve, 100))
			}

			// Verify the job was processed
			expect(jobCompleted).toBe(true)
			expect(jobData).toMatchObject({
				testInput: 'hello world',
				counter: 42,
			})

			// Verify the process completed using CamundaAssert
			const assertion = CamundaAssert.assertThat(processInstance)
			await assertion.isCompleted()

			log('✅ gRPC worker test completed successfully')
		} finally {
			// Clean up the worker and temp file
			worker.close()
			if (fs.existsSync(bpmnPath)) {
				fs.unlinkSync(bpmnPath)
			}
		}
	}, 30000) // 30 second timeout for the test
})
