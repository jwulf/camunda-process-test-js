# Camunda Process Test for Node.js

***THIS IS IN ACTIVE DEVELOPMENT AND NOT READY FOR USE YET***

A comprehensive testing framework for Camunda process automation in Node.js/TypeScript, inspired by the Java `camunda-process-test-java` library.

## Features

- 🚀 **Easy Setup**: Simple decorator-based or function-based test configuration
- 🐳 **Container Management**: Automatic Camunda/Zeebe container lifecycle management using TestContainers
- 🔍 **Rich Assertions**: Fluent API for verifying process execution, user tasks, and decisions
- 🎭 **Job Worker Mocking**: Powerful mocking capabilities for service tasks
- ⏰ **Time Control**: Full control over Zeebe's internal clock for testing timers and timeouts
- 🔧 **TypeScript Support**: Full TypeScript support with type definitions
- 🧪 **Jest Integration**: Seamless integration with Jest testing framework
- 🐛 **Debug Mode**: Comprehensive debugging for Docker operations and test execution

## Installation

```bash
npm install @camunda8/process-test-node --save-dev

# Peer dependencies
npm install jest @types/jest --save-dev
```

## Prerequisites

- **Docker Desktop** - Must be running for container management
- **Node.js** - Version 18+ recommended
- **Jest** - Version 29+ for test execution

## Quick Start

### Using the Function Approach (Recommended)

```typescript
import { Camunda8 } from '@camunda8/sdk';
import {
  setupCamundaProcessTest,
  CamundaAssert
} from '@camunda/process-test-node';

describe('Order Process', () => {
  const setup = setupCamundaProcessTest();

  test('should complete order successfully', async () => {
    const client = setup.getClient().getCamundaRestClient();
    const context = setup.getContext();

    // Deploy process
    await context.deployProcess('./processes/order-process.bpmn');

    // Mock job workers
    await context.mockJobWorker('collect-money')
      .thenComplete({ paid: true });
    
    await context.mockJobWorker('ship-parcel')
      .thenComplete({ tracking: 'TR123456' });

    // Start process instance
    const processInstance = await client.createProcessInstance({
      processDefinitionId: 'order-process',
      variables: { orderId: 'order-123', amount: 99.99 }
    });

    // Verify process execution
    const assertion = CamundaAssert.assertThat(processInstance);
    await assertion.isCompleted();
    await assertion.hasVariables({
      paid: true,
      tracking: 'TR123456'
    });
  }, 60000); // 60 second timeout for container startup
});
```

### Using Decorators

```typescript
import { Camunda8 } from '@camunda8/sdk';
import {
  CamundaProcessTest,
  CamundaAssert,
  CamundaProcessTestContext
} from '@camunda/process-test-node';

@CamundaProcessTest
class MyProcessTest {
  private client!: Camunda8; // Automatically injected
  private context!: CamundaProcessTestContext; // Automatically injected

  async testOrderProcess() {
    // Deploy process
    await this.context.deployProcess('./processes/order-process.bpmn');

    // Mock job workers
    await this.context.mockJobWorker('collect-money')
      .thenComplete({ paid: true });

    await this.context.mockJobWorker('ship-parcel')
      .thenComplete({ tracking: 'TR123456' });

    // Start process instance
    const camunda = this.client.getCamundaRestClient();
    const processInstance = await camunda.createProcessInstance({
      processDefinitionId: 'order-process',
      variables: { orderId: 'order-123', amount: 99.99 }
    });

    // Verify process execution
    const assertion = CamundaAssert.assertThat(processInstance);
    await assertion.isCompleted();
    await assertion.hasVariables({
      paid: true,
      tracking: 'TR123456'
    });
  }
}
```

## Configuration

Configure the testing framework via configuration file, environment variables, and Jest configuration.

### Configuration File (Recommended)

Create a `camunda-test-config.json` file in your project root to configure container images and runtime settings:

```json
{
  "camundaVersion": "8.7.0",
  "camundaDockerImageName": "camunda/camunda",
  "camundaDockerImageVersion": "8.8.0-alpha6",
  "connectorsDockerImageName": "camunda/connectors-bundle",
  "connectorsDockerImageVersion": "8.8.0-alpha6",
  "runtimeMode": "MANAGED"
}
```

#### Configuration Properties

| Property | Description | Default | Environment Variable |
|----------|-------------|---------|---------------------|
| `camundaVersion` | Camunda platform version | `SNAPSHOT` | `CAMUNDA_DOCKER_IMAGE_VERSION` |
| `camundaDockerImageName` | Zeebe container image name | `camunda/camunda` | `CAMUNDA_DOCKER_IMAGE_NAME` |
| `camundaDockerImageVersion` | Zeebe container image version | `SNAPSHOT` | `CAMUNDA_DOCKER_IMAGE_VERSION` |
| `connectorsDockerImageName` | Connectors container image name | `camunda/connectors-bundle` | `CONNECTORS_DOCKER_IMAGE_NAME` |
| `connectorsDockerImageVersion` | Connectors container image version | `SNAPSHOT` | `CONNECTORS_DOCKER_IMAGE_VERSION` |
| `runtimeMode` | Runtime mode (`MANAGED` or `REMOTE`) | `MANAGED` | `CAMUNDA_RUNTIME_MODE` |
| `zeebeClientId` | Client ID for OAuth authentication | `""` | `ZEEBE_CLIENT_ID` |
| `zeebeClientSecret` | Client secret for OAuth authentication | `""` | `ZEEBE_CLIENT_SECRET` |
| `camundaOauthUrl` | OAuth URL for authentication | `""` | `CAMUNDA_OAUTH_URL` |
| `zeebeRestAddress` | REST API address for remote Zeebe | `""` | `ZEEBE_REST_ADDRESS` |
| `zeebeTokenAudience` | Token audience for OAuth | `""` | `ZEEBE_TOKEN_AUDIENCE` |
| `camundaAuthStrategy` | Authentication strategy | `""` (auto-detect) | `CAMUNDA_AUTH_STRATEGY` |
| `camundaMonitoringApiAddress` | Monitoring API address | Auto-calculated from REST address:9600 | `CAMUNDA_MONITORING_API_ADDRESS` |
| `connectorsRestApiAddress` | Connectors API address | Auto-calculated from REST address:8085 | `CONNECTORS_REST_API_ADDRESS` |

#### Configuration Priority

The framework uses the following priority order for configuration:
1. **Environment variables** (highest priority)
2. **Configuration file** (`camunda-test-config.json`)
3. **Framework defaults** (lowest priority)

#### Example Configurations

**Production-ready setup:**
```json
{
  "camundaDockerImageName": "camunda/camunda",
  "camundaDockerImageVersion": "8.8.0-alpha6",
  "connectorsDockerImageName": "camunda/connectors-bundle", 
  "connectorsDockerImageVersion": "8.8.0-alpha6",
  "runtimeMode": "MANAGED"
}
```

**Development with specific versions:**
```json
{
  "camundaDockerImageName": "camunda/camunda",
  "camundaDockerImageVersion": "8.8.0",
  "runtimeMode": "MANAGED"
}
```

**C8Run example (auto-calculated APIs):**
```json
{
  "runtimeMode": "REMOTE",
  "zeebeRestAddress": "http://localhost:8080",
  "camundaAuthStrategy": "NONE"
}
```
**Remote runtime (existing Camunda instance):**
```json
{
  "runtimeMode": "REMOTE",
  "zeebeRestAddress": "https://your-cluster.region.zeebe.camunda.io:443",
  "zeebeClientId": "your-client-id",
  "zeebeClientSecret": "your-client-secret",
  "camundaOauthUrl": "https://login.cloud.camunda.io/oauth/token",
  "zeebeTokenAudience": "zeebe.camunda.io"
}
```

**SaaS example with explicit API addresses:**
```json
{
  "runtimeMode": "REMOTE",
  "zeebeRestAddress": "https://your-cluster.region.zeebe.camunda.io:443",
  "zeebeClientId": "your-client-id",
  "zeebeClientSecret": "your-client-secret",
  "camundaOauthUrl": "https://login.cloud.camunda.io/oauth/token",
  "zeebeTokenAudience": "zeebe.camunda.io",
  "camundaMonitoringApiAddress": "https://your-cluster.region.zeebe.camunda.io:9600",
  "connectorsRestApiAddress": "https://your-cluster.region.zeebe.camunda.io:8085"
}
```

**Self-managed example with custom ports:**
```json
{
  "runtimeMode": "REMOTE",
  "zeebeRestAddress": "http://camunda.mycompany.com:8080",
  "camundaAuthStrategy": "NONE",
  "camundaMonitoringApiAddress": "http://camunda.mycompany.com:9600",
  "connectorsRestApiAddress": "http://connectors.mycompany.com:8085"
}
```

### Environment Variables

Override configuration file settings or set additional options:

```bash
# Environment configuration
CAMUNDA_DOCKER_IMAGE_VERSION=8.8.0-alpha6
CAMUNDA_DOCKER_IMAGE_NAME=camunda/camunda
CONNECTORS_DOCKER_IMAGE_VERSION=8.8.0-alpha6
CAMUNDA_RUNTIME_MODE=MANAGED  

# Remote runtime configuration (C8Run)
ZEEBE_REST_ADDRESS=http://localhost:8080
CAMUNDA_RUNTIME_MODE=REMOTE

# Remote runtime configuration (SaaS)
ZEEBE_REST_ADDRESS=https://your-cluster.region.zeebe.camunda.io:443
ZEEBE_CLIENT_ID=your-client-id
ZEEBE_CLIENT_SECRET=your-client-secret
CAMUNDA_OAUTH_URL=https://login.cloud.camunda.io/oauth/token
ZEEBE_TOKEN_AUDIENCE=zeebe.camunda.io
CAMUNDA_AUTH_STRATEGY=OAUTH 
CAMUNDA_RUNTIME_MODE=REMOTE

# Runtime configuration  
CAMUNDA_CONNECTORS_ENABLED=true

# Debug settings
DEBUG=camunda:*  # Enable debug logging
```

### Jest Configuration

Jest configuration in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest', // If you are testing TypeScript
  testEnvironment: 'node',
  // Global timeout - will be overridden per test as needed
  testTimeout: process.env.CI ? 300000 : 30000,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run tests sequentially to avoid container conflicts
};
```

Essential is to set the test timeout high enough to pull and start the container if you are running in MANAGED mode.

## Remote Runtime Configuration

The framework supports connecting to remote Camunda instances instead of managing local Docker containers. This is useful for testing against:

- **C8Run** - Local development runtime
- **Self-managed** - Your own Camunda installations
- **Camunda SaaS** - Cloud-hosted Camunda instances

### Authentication Strategies

#### No Authentication (C8Run/Self-managed)
For local or internal instances without authentication:
```json
{
  "runtimeMode": "REMOTE",
  "zeebeRestAddress": "http://localhost:8080",
  "camundaAuthStrategy": "NONE"
}
```

#### OAuth Authentication (SaaS)
Required for Camunda SaaS instances:
```json
{
  "runtimeMode": "REMOTE",
  "zeebeRestAddress": "https://your-cluster.region.zeebe.camunda.io:443",
  "zeebeClientId": "your-client-id",
  "zeebeClientSecret": "your-client-secret",
  "camundaOauthUrl": "https://login.cloud.camunda.io/oauth/token",
  "zeebeTokenAudience": "zeebe.camunda.io"
}
```

### API Address Auto-calculation

The framework automatically calculates monitoring and connectors API addresses:
- **Monitoring API**: REST address with port 9600
- **Connectors API**: REST address with port 8085

For `zeebeRestAddress: "https://example.com:443"`:
- Monitoring API → `https://example.com:9600`
- Connectors API → `https://example.com:8085`

You can override these defaults by explicitly setting:
- `camundaMonitoringApiAddress`
- `connectorsRestApiAddress`

## Core API

### Process Deployment

```typescript
// Deploy BPMN process
await context.deployProcess('./processes/my-process.bpmn');

// Deploy DMN decision
await context.deployDecision('./decisions/approval.dmn');
```

### Process Instance Creation

```typescript
const client = setup.getClient();
const camunda = client.getCamundaRestClient();

const processInstance = await camunda.createProcessInstance({
  processDefinitionId: 'my-process',
  variables: { input: 'test-data' }
});
```

### Job Worker Mocking

```typescript
// Complete successfully
await context.mockJobWorker('payment-service')
  .thenComplete({ transactionId: 'tx-123' });

// Throw business error
await context.mockJobWorker('validation-service')
  .thenThrowBpmnError('VALIDATION_ERROR', 'Invalid data');

// Throw technical error
await context.mockJobWorker('external-api')
  .thenThrowError('Connection timeout');

// Custom behavior
await context.mockJobWorker('complex-task')
  .withHandler(async (job) => {
    const { amount } = job.variables;
    if (amount > 1000) {
      return { approved: false };
    }
    return { approved: true };
  });
```

### Process Instance Assertions

```typescript
const assertion = CamundaAssert.assertThat(processInstance);

// Basic state assertions
await assertion.isCompleted();     // Process finished successfully
await assertion.isActive();        // Process is still running
await assertion.isTerminated();    // Process was terminated

// Variable assertions
await assertion.hasVariables({ status: 'approved' });
await assertion.hasVariable('orderStatus', 'completed');

// Activity assertions
await assertion.hasCompletedElements('task1', 'task2');
await assertion.hasActiveElements('waiting-task');

// Error assertions
await assertion.hasNoIncidents();
await assertion.hasIncidentWithMessage('timeout');
```

### User Task Assertions

```typescript
const userTaskAssertion = CamundaAssert.assertThatUserTask({ 
  type: 'elementId', 
  value: 'approve-task' 
});

await userTaskAssertion.exists();
await userTaskAssertion.isAssignedTo('john.doe');
await userTaskAssertion.isUnassigned();
await userTaskAssertion.hasCandidateGroups('managers');
await userTaskAssertion.hasVariables({ priority: 'high' });
await userTaskAssertion.complete({ approved: true });
```

### Decision Assertions

```typescript
const decisionAssertion = CamundaAssert.assertThatDecision({ 
  type: 'decisionId', 
  value: 'approval' 
});

await decisionAssertion.wasEvaluated();
await decisionAssertion.hasResult({ approved: true });
await decisionAssertion.hasResultContaining({ score: 85 });
```

### Time Manipulation

Control Zeebe's internal clock for testing time-based processes like timers, timeouts, and scheduled tasks.

```typescript
// Increase time for timer testing (async - advances Zeebe's actual clock)
await context.increaseTime({ hours: 24 });
await context.increaseTime({ minutes: 30 });
await context.increaseTime(5000); // milliseconds

// Get current test time
const currentTime = context.getCurrentTime();
```

#### Timer Process Testing

```typescript
test('should complete timer-based process', async () => {
  const client = setup.getClient();
  const context = setup.getContext();

  // Deploy process with timer event
  await context.deployProcess('./processes/timer-process.bpmn');

  // Mock service task after timer
  await context.mockJobWorker('after-timer')
    .thenComplete({ timerCompleted: true });

  // Start process
  const camunda = client.getCamundaRestClient();
  const processInstance = await camunda.createProcessInstance({
    processDefinitionId: 'timer-process',
    variables: {}
  });

  // Verify process is waiting at timer
  const assertion1 = CamundaAssert.assertThat(processInstance);
  await assertion1.isActive();
  await assertion1.hasActiveElements('wait-timer');

  // Advance time to trigger timer (advances Zeebe's internal clock)
  await context.increaseTime({ hours: 1 });

  // Verify timer triggered and process completed
  const assertion2 = CamundaAssert.assertThat(processInstance);
  await assertion2.isCompleted();
  await assertion2.hasCompletedElements('wait-timer', 'after-timer-task');
});
```

#### Clock Management API

The framework provides direct access to Zeebe's clock management through the `CamundaClock` utility:

```typescript
import { CamundaClock } from '@camunda/process-test-node';

// Create clock instance (usually done automatically by the framework)
const runtime = setup.getRuntime();
const clock = new CamundaClock(runtime);

// Get current Zeebe time
const currentTime = await clock.getCurrentTime();

// Advance clock by milliseconds
await clock.addTime(60000); // 1 minute

// Advance using convenience method
await clock.advanceTime(1, 'hours');
await clock.advanceTime(30, 'minutes');
await clock.advanceTime(5, 'seconds');

// Reset clock to system time
await clock.resetClock();
```

#### Supported Time Units

```typescript
// All these are equivalent to 1 hour
await context.increaseTime(3600000); // milliseconds
await context.increaseTime({ hours: 1 });
await context.increaseTime({ minutes: 60 });
await context.increaseTime({ seconds: 3600 });

// Combined durations
await context.increaseTime({ 
  days: 1, 
  hours: 2, 
  minutes: 30, 
  seconds: 45 
});
```

**Notes**: 

* Time manipulation uses Zeebe's internal clock management API and requires the `ZEEBE_CLOCK_CONTROLLED=true` environment variable (automatically set by the framework).
* Time manipulation is not available when testing against SaaS using the remote engine

## Debug Mode

Enable comprehensive debugging to inspect Docker operations, process deployments, and test execution:

```bash
# Enable all debugging
DEBUG=camunda:* npm test

# Enable specific categories
DEBUG=camunda:test:container npm test  # Docker operations
DEBUG=camunda:test:deploy npm test     # Process deployments
DEBUG=camunda:test:runtime npm test    # Runtime lifecycle
DEBUG=camunda:test:logs npm test       # Container log capture
```

### Debug Categories

- `camunda:test:runtime` - Runtime startup/shutdown
- `camunda:test:container` - Docker container operations
- `camunda:test:docker` - Docker image pulls and versions
- `camunda:test:deploy` - BPMN/DMN deployments
- `camunda:test:worker` - Job worker operations
- `camunda:test:context` - Test context lifecycle
- `camunda:test:logs` - Container log capture

### Container Log Capture

When debugging is enabled, detailed container logs are saved to `./camunda-test-logs/`:
- `elasticsearch-{timestamp}.log` - Elasticsearch startup and operation logs
- `camunda-{timestamp}.log` - Camunda broker logs with BPMN processing details
- `connectors-{timestamp}.log` - Connector runtime logs (if enabled)

For detailed debugging instructions, see [DEBUG.md](DEBUG.md).

## Examples

This repository includes working examples:

- [`examples/simple.test.ts`](examples/simple.test.ts) - Basic process testing
- [`examples/debug.test.ts`](examples/debug.test.ts) - Debug mode demonstration
- [`examples/basic-test.test.ts`](examples/basic-test.test.ts) - Comprehensive examples

All examples include BPMN/DMN files in [`examples/resources/`](examples/resources/).

### Running Examples

```bash
# Build first
npm run build

# Run simple example
npm test examples/simple.test.ts

# Run with debugging
DEBUG=camunda:* npm test examples/debug.test.ts

# Run all examples
npm test examples/
```

## Testing Patterns

### Integration Testing

```typescript
describe('Order Integration Test', () => {
  const setup = setupCamundaProcessTest();

  test('should complete order flow', async () => {
    const client = setup.getClient();
    const context = setup.getContext();

    // Deploy all related processes and decisions
    await context.deployProcess('./processes/order-process.bpmn');
    await context.deployProcess('./processes/payment-process.bpmn');
    await context.deployDecision('./decisions/credit-check.dmn');

    // Mock external services
    await context.mockJobWorker('credit-check-service')
      .thenComplete({ creditScore: 750 });

    await context.mockJobWorker('payment-gateway')
      .thenComplete({ transactionId: 'tx-12345', status: 'success' });

    // Test the complete flow
    const camunda = client.getCamundaRestClient();
    const orderInstance = await camunda.createProcessInstance({
      processDefinitionId: 'order-process',
      variables: { customerId: 'c123', amount: 599.99 }
    });

    const assertion = CamundaAssert.assertThat(orderInstance);
    await assertion.isCompleted();
    await assertion.hasVariables({
      creditScore: 750,
      paymentStatus: 'success',
      orderStatus: 'completed'
    });
  });
});
```

### Error Testing

```typescript
test('should handle payment failure', async () => {
  const client = setup.getClient();
  const context = setup.getContext();

  await context.deployProcess('./processes/payment-process.bpmn');

  // Simulate payment failure
  await context.mockJobWorker('payment-service')
    .thenThrowBpmnError('PAYMENT_FAILED', 'Insufficient funds');

  const camunda = client.getCamundaRestClient();
  const processInstance = await camunda.createProcessInstance({
    processDefinitionId: 'payment-process',
    variables: { amount: 1000000 } // Large amount
  });

  // Verify error handling path
  const assertion = CamundaAssert.assertThat(processInstance);
  await assertion.isCompleted();
  await assertion.hasCompletedElements('payment-failed-event', 'notify-customer');
});
```

## Performance Tips

### Container Startup
- **First run**: 3-5 minutes (image downloads)
- **Subsequent runs**: 30-60 seconds (cached images)
- **Parallel tests**: Use `maxWorkers: 1` in Jest config

### Optimizations
```bash
# Pre-pull images to speed up tests
docker pull camunda/camunda:8.8.0-alpha6

# Clean up containers after testing
docker container prune -f
```

## Troubleshooting

### Common Issues

#### 1. "Docker daemon not running"
**Solution**: Start Docker Desktop
```bash
# Check Docker is running
docker ps

# If not running, start Docker Desktop
```

#### 2. "Timeout waiting for container"
**Solution**: Increase Jest timeout or check Docker resources
```bash
# Run with longer timeout
npm test --testTimeout=300000

# Check Docker resources in Docker Desktop settings
```

#### 3. "Port already in use"
**Solution**: Clean up existing containers
```bash
# Stop all Camunda containers
docker stop $(docker ps -q --filter ancestor=camunda/camunda)

# Or restart Docker Desktop
```

### Debug Troubleshooting
```bash
# See container startup details
DEBUG=camunda:test:container npm test

# Check deployment issues  
DEBUG=camunda:test:deploy npm test

# Monitor runtime problems
DEBUG=camunda:test:runtime npm test

# Capture container logs for detailed inspection
DEBUG=camunda:test:logs npm test
# Then check ./camunda-test-logs/ for detailed container logs
```

## API Reference

### Core Classes

- **`setupCamundaProcessTest()`**: Function for test setup
- **`@CamundaProcessTest`**: Decorator for test classes
- **`CamundaAssert`**: Main assertion entry point
- **`CamundaProcessTestContext`**: Test context and utilities
- **`CamundaClock`**: Clock management for time-based testing
- **`JobWorkerMock`**: Job worker mocking utilities

### Assertion Classes

- **`ProcessInstanceAssert`**: Process instance assertions
- **`UserTaskAssert`**: User task assertions  
- **`DecisionInstanceAssert`**: Decision instance assertions

### Selector Types

- **Element Selectors**: `{ type: 'id' | 'name' | 'type' | 'custom', value: string | function }`
- **Process Instance Selectors**: `{ type: 'key' | 'processId' | 'custom', value: string | function }`
- **User Task Selectors**: `{ type: 'key' | 'elementId' | 'assignee' | 'custom', value: string | function }`
- **Decision Selectors**: `{ type: 'key' | 'decisionId' | 'processInstanceKey' | 'custom', value: string | function }`

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## CI/CD Support

This library includes comprehensive CI/CD capabilities with sophisticated GitHub Actions workflows:

### Test Types
- **Unit Tests**: Fast TypeScript-based tests (`npm test`)
- **Integration Tests**: Full Docker-based Camunda tests (`npm run test:integration`)

### GitHub Actions Features
- **Docker Optimization**: Pre-pull of Camunda images for faster CI execution
- **Extended Timeouts**: 45-minute timeout for complex integration scenarios
- **Environment Configuration**: Proper CI environment variables and debug settings
- **Parallel Execution**: Separate jobs for code quality and integration testing
- **Comprehensive Coverage**: Both unit and integration tests run on every PR/push

### Running Tests Locally
```bash
# Unit tests (fast, no Docker required)
npm test

# Integration tests (requires Docker)
npm run test:integration

# Run specific integration test
npm run test:integration -- --testNamePattern="simple"
```

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://docs.camunda.io)
- 💬 [Community Forum](https://forum.camunda.io)
- 🐛 [Issue Tracker](https://github.com/camunda/camunda-process-test-node/issues)
