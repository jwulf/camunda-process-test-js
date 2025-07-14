# Camunda Process Test Examples

This directory contains working examples demonstrating how to use the Camunda Process Test framework for Node.js.

## 📁 Examples Overview

| Example | Description | Use Case |
|---------|-------------|----------|
| [`simple.test.ts`](simple.test.ts) | Basic process testing | Quick start, single process |
| [`debug.test.ts`](debug.test.ts) | Debug mode demonstration | Troubleshooting, container inspection |
| [`basic-test.test.ts`](basic-test.test.ts) | Comprehensive examples | Multiple patterns, decorator/function approaches |

## 🎯 BPMN/DMN Resources

All examples use process definitions in the [`resources/`](resources/) directory:

| File | Type | Description |
|------|------|-------------|
| `simple-process.bpmn` | Process | Basic start → service task → end |
| `user-task-process.bpmn` | Process | User task with candidate groups |
| `decision-process.bpmn` | Process | Business rule task calling DMN |
| `approval-decision.dmn` | Decision | DMN table with approval logic |
| `error-process.bpmn` | Process | Error boundary event handling |
| `timer-process.bpmn` | Process | Intermediate timer event |
| `multi-task-process.bpmn` | Process | Sequential service tasks |

## 🚀 Prerequisites

### Required Software
- **Docker Desktop** - Must be running for container management
- **Node.js** - Version 18+ recommended
- **npm** - For package management

### Docker Images
The framework automatically pulls these images on first run:
- `camunda/zeebe:8.7.0` (Zeebe process engine)
- `docker.elastic.co/elasticsearch/elasticsearch:8.11.0` (Required by Zeebe)

**Note**: First run takes 3-5 minutes for image downloads. Subsequent runs are much faster (~30-60 seconds).

## 🏃 Running Examples

### Quick Start
```bash
# 1. Build the framework
npm run build

# 2. Run a simple example
npm test examples/simple.test.ts

# 3. Run with debugging (recommended for first time)
DEBUG=camunda:* npm test examples/simple.test.ts
```

### All Examples
```bash
# Run all examples
npm test examples/

# Run specific example with timeout
npm test examples/basic-test.test.ts --testTimeout=180000
```

## 🐛 Debug Mode

Enable debugging to see detailed container operations and test execution:

### Debug Categories
```bash
# Everything (verbose)
DEBUG=camunda:* npm test examples/debug.test.ts

# Container operations only
DEBUG=camunda:test:container npm test examples/simple.test.ts

# Deployment details
DEBUG=camunda:test:deploy npm test examples/basic-test.test.ts

# Runtime lifecycle
DEBUG=camunda:test:runtime npm test examples/simple.test.ts

# Container log capture
DEBUG=camunda:test:logs npm test examples/simple.test.ts
```

### What You'll See
With debugging enabled, you get detailed output about:
- 🐳 Docker container startup sequence
- 📥 Image pulls and container IDs
- 🔗 Port mappings and service URLs
- 📋 BPMN/DMN deployment details
- 🔧 Job worker creation and registration
- ✅ Test lifecycle and assertions
- 📄 Container log capture (saved to `./camunda-test-logs/`)

## 📖 Example Details

### 1. Simple Example (`simple.test.ts`)

**Purpose**: Demonstrates basic process testing with minimal setup.

**What it does**:
- Deploys a simple BPMN process using function approach
- Starts a process instance with `getCamundaRestClient()`
- Mocks a service task with job worker
- Asserts process completion

**Key differences from documentation**:
- Uses `getCamundaRestClient()` instead of `getZeebeGrpcApiClient()`
- Uses `mockJobWorker().thenComplete()` instead of `createJobWorker().complete().start()`
- Uses `processDefinitionId` instead of `bpmnProcessId`

**Run it**:
```bash
npm test examples/simple.test.ts
```

**Expected output**: ✅ Process completes successfully

---

### 2. Debug Example (`debug.test.ts`)

**Purpose**: Shows how to use debug mode for troubleshooting and inspection.

**What it does**:
- Same as simple example but with extensive debug comments
- Demonstrates all debug categories
- Includes troubleshooting instructions

**Run it**:
```bash
DEBUG=camunda:* npm test examples/debug.test.ts
```

**Expected output**: ✅ Process completes with verbose debug information

---

### 3. Comprehensive Examples (`basic-test.test.ts`)

**Purpose**: Complete showcase of framework capabilities.

**What it demonstrates**:
- **Decorator approach**: `@CamundaProcessTest` class-based testing
- **Function approach**: `setupCamundaProcessTest()` functional testing
- **User tasks**: Task assignment and completion
- **DMN decisions**: Business rule evaluation
- **Error handling**: BPMN error boundary events
- **Timers**: Time-based process execution
- **Multiple tasks**: Sequential service task processing

**Run it**:
```bash
npm test examples/basic-test.test.ts
```

**Expected output**: ✅ Multiple test scenarios pass

## ⚡ Performance Tips

### Container Startup
- **First run**: 3-5 minutes (image downloads)
- **Subsequent runs**: 30-60 seconds (cached images)
- **Parallel tests**: Use `maxWorkers: 1` in Jest config

### Optimizations
```bash
# Pre-pull images to speed up tests
docker pull camunda/zeebe:8.7.0
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# Clean up containers after testing
docker container prune -f
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "manifest for camunda/zeebe:X.X.X not found"
**Solution**: Check Docker image version in configuration
```bash
# Use known working version
CAMUNDA_DOCKER_IMAGE_VERSION=8.7.0 npm test examples/simple.test.ts
```

#### 2. "Docker daemon not running"
**Solution**: Start Docker Desktop
```bash
# Check Docker is running
docker ps

# If not running, start Docker Desktop
```

#### 3. "Timeout waiting for container"
**Solution**: Increase Jest timeout or check Docker resources
```bash
# Run with longer timeout
npm test examples/simple.test.ts --testTimeout=300000

# Check Docker resources in Docker Desktop settings
```

#### 4. "Port already in use"
**Solution**: Clean up existing containers
```bash
# Stop all Camunda containers
docker stop $(docker ps -q --filter ancestor=camunda/zeebe)

# Or restart Docker Desktop
```

#### 5. "Elasticsearch connection failed"
**Solution**: This has been fixed in the latest version
- The framework now correctly configures Elasticsearch URLs for Zeebe
- Container logs are captured for debugging
- Non-blocking log capture prevents hanging

### Debug Troubleshooting
```bash
# See container startup details
DEBUG=camunda:test:container npm test examples/debug.test.ts

# Check deployment issues
DEBUG=camunda:test:deploy npm test examples/simple.test.ts

# Monitor runtime problems
DEBUG=camunda:test:runtime npm test examples/basic-test.test.ts

# Capture container logs for detailed inspection
DEBUG=camunda:test:logs npm test examples/simple.test.ts
# Then check ./camunda-test-logs/ for detailed container logs
```

### Container Log Analysis
When debugging is enabled, detailed container logs are saved to `./camunda-test-logs/`:
- `elasticsearch-{timestamp}.log` - Elasticsearch startup and operation logs
- `zeebe-{timestamp}.log` - Zeebe broker logs with BPMN processing details
- `zeebe-startup-{timestamp}.log` - Initial Zeebe startup logs
- `zeebe-timeout-{timestamp}.log` - Logs when Zeebe startup times out

These logs contain:
- Container startup sequences and timing
- BPMN process deployment confirmations
- Job activation and completion details
- Error messages and stack traces
- Performance metrics and resource usage

## 📚 Current API

### Client Usage
```typescript
const zeebe = client.getCamundaRestClient();
const processInstance = await zeebe.createProcessInstance({
  processDefinitionId: 'my-process',
  variables: { input: 'test' }
});


### Job Worker Mocking
```typescript
await context.mockJobWorker('job-type')
  .thenComplete({ result: 'success' });
```

### Assertions
```typescript
const assertion = await CamundaAssert.assertThat(processInstance);
await assertion.isCompleted();
```

## 🎯 Creating Your Own Tests

Use these examples as starting points:

### For Simple Process Testing
Start with [`simple.test.ts`](simple.test.ts) and modify:
- Process file path
- Process definition ID
- Job worker types
- Variables and assertions

### For Complex Scenarios
Use [`basic-test.test.ts`](basic-test.test.ts) patterns:
- Copy relevant test methods
- Adapt to your BPMN processes
- Add your specific assertions

### For Debugging Issues
Use [`debug.test.ts`](debug.test.ts) approach:
- Enable relevant debug categories
- Add logging to understand test flow
- Inspect container operations

## 🔧 Jest Configuration

Recommended `jest.config.js` for running these examples:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 2 minutes for container startup
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run tests sequentially to avoid container conflicts
  roots: ['<rootDir>/source', '<rootDir>/examples'],
  testMatch: [
    '**/__tests__/**/*.(ts|js)',
    '**/*.(test|spec).(ts|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'source/**/*.(ts|js)',
    '!source/**/*.d.ts',
  ],
  setupFilesAfterEnv: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true
};
```

## 🤝 Support

If you encounter issues:
1. Check this README's troubleshooting section
2. Run with debug mode enabled: `DEBUG=camunda:* npm test`
3. Review the main documentation in [`../README.md`](../README.md)
4. Check Docker Desktop status and resources
5. Examine container logs in `./camunda-test-logs/`

Happy testing! 🎉
