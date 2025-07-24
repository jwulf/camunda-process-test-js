# Camunda Process Test Node.js - AI Coding Agent Instructions

## Architecture Overview

This is a **process testing framework for Camunda 8** that provides Jest-based testing utilities for BPMN processes. The framework supports both **container-managed** (Docker) and **remote** runtime modes.

### Core Components

- **Runtime Management**: `CamundaProcessTestRuntime` handles Docker containers or remote connections
- **Test Context**: `CamundaProcessTestContext` provides deployment, job mocking, and time control
- **Assertions**: `CamundaAssert` offers fluent API for process verification
- **Configuration**: Centralized in `CamundaRuntimeConfigurationMap.ts` with environment variable overrides

### Test Patterns

Two approaches available:

1. **Decorator Pattern**: `@CamundaProcessTest` class decorator with automatic injection
2. **Function Pattern**: `setupCamundaProcessTest()` with explicit getter calls

## Essential Development Workflows

### Building & Testing

```bash
npm run build              # TypeScript compilation to distribution/
npm test                   # All tests (unit + integration)
npm run test:unit          # Unit tests only (faster)
npm run examples:simple    # Run basic example
npm run examples:simple:debug  # With debug output
```

### Debug Mode

- Enable with `DEBUG=camunda:test:*` environment variable
- Creates `camunda-test-logs/` directory with container logs
- Use `debugContainer`, `debugDeploy`, `debugWorker` namespaces for specific areas

### Configuration Management

- **File**: `camunda-test-config.json` (root directory)
- **Environment**: Variables override JSON (e.g., `CAMUNDA_DOCKER_IMAGE_VERSION`)
- **Central Map**: All properties defined in `CamundaRuntimeConfigurationMap.ts`
- **Auto-typing**: Configuration properties automatically typed from the map

## Framework-Specific Patterns

### Test Structure (Decorator Pattern)

```typescript
@CamundaProcessTest
class MyProcessTest {
	private client!: Camunda8 // Auto-injected
	private context!: CamundaProcessTestContext // Auto-injected

	async testProcessName() {
		// Methods starting with 'test' auto-registered
		await this.context.deployProcess('path/to/process.bpmn')
		// Test implementation
	}
}
```

### Job Worker Mocking

```typescript
// Chain pattern for job worker responses
this.context
	.mockJobWorker('service-task')
	.thenComplete({ result: 'success' })
	.thenFail('error-code', 'Error message', 3) // retry 3 times
```

### Time Control

```typescript
await this.context.increaseTime({ hours: 1 }) // Advance Zeebe clock
this.context.resetTime() // Reset to system time
```

### Runtime Modes

- **MANAGED** (default): Uses TestContainers with Docker
- **REMOTE**: Connects to existing Camunda instance (SaaS/self-managed)

## Key Implementation Details

### Configuration Extensibility

- Add new properties to `CAMUNDA_RUNTIME_CONFIGURATION` map
- Properties automatically become typed and available via `ContainerRuntimePropertiesUtil`
- Use `useVersionResolver: true` for version-dependent properties

### Container Management

- **Startup timeout**: 2 minutes with custom wait strategies
- **Port mapping**: Dynamic ports with `getMappedPort()`
- **Log capture**: Automatic on startup failure or debug mode
- **Environment variables**: Set via `camundaEnvVars` and `connectorsEnvVars`

### Assertion System

- **Polling-based**: Uses `PollingOperation` from `@camunda8/sdk`
- **Configurable timeouts**: Global settings via `CamundaAssert.setTimeout()`
- **Element selectors**: Support for elementId, processInstanceKey, etc.

### Testing Lifecycle

1. **beforeAll**: Runtime startup, client creation, context initialization
2. **beforeEach**: Test state reset, time reset
3. **afterEach**: Job worker cleanup, test data cleanup
4. **afterAll**: Container shutdown, assertion reset

## Critical Integration Points

### External Dependencies

- **@camunda8/sdk**: Official Camunda client for REST/gRPC operations
- **testcontainers**: Docker container lifecycle management
- **jest**: Test runner with 180s timeout for container operations

### Container Communication

- **Zeebe Gateway**: Port 26500 (gRPC) and 8080 (REST API)
- **Monitoring API**: Port 9600 (process queries, time control)
- **Connectors**: Port 8085 (external connector runtime)

### Remote Connection Strategy

- **OAuth**: Auto-detected for SaaS/C8Run environments
- **NONE**: Self-managed instances without authentication
- **API calculation**: Monitoring/connectors addresses auto-derived from REST address

## Common Anti-Patterns to Avoid

- Don't call Jest lifecycle hooks manually - use decorator or setup function
- Don't create multiple `CamundaProcessTestContext` instances
- Don't forget to reset job workers between tests
- Don't use real timers - use `context.increaseTime()` for time-based processes
- Don't hardcode container ports - use dynamic port mapping

## File Structure Conventions

- **source/**: TypeScript source code
- **distribution/**: Compiled output (published)
- **test/**: Unit tests
- **examples/**: Integration tests and usage examples
- **examples/resources/**: BPMN/DMN test files
