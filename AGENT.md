# Camunda Process Test Node.js - Agent Guide

## Commands
- **Build**: `npm run build` (compiles TypeScript to dist/)
- **Test**: `npm test` (runs all tests)
- **Test single file**: `npm test <path>` (e.g., `npm test test/runtime/CamundaRuntimeProperties.test.ts`)
- **Test unit tests only**: `npm test test/` (runs only unit tests, faster)
- **Test with watch**: `npm run test:watch`
- **Lint**: `npm run lint`
- **Debug tests**: `DEBUG=camunda:* npm test`

### Example Commands
- **Run all examples**: `npm run examples`
- **Run simple example**: `npm run examples:simple`
- **Run debug example**: `npm run examples:debug`
- **Run basic example**: `npm run examples:basic`
- **Run with debug output**: `npm run examples:simple:debug`
- **Run all examples with debug**: `npm run examples:all:debug`

## Architecture
- **Main entry**: `source/index.ts` - exports all public APIs
- **Source structure**: `source/` contains all TypeScript source code
- **Test structure**: `test/` contains unit tests, `examples/` contains integration tests
- **Output**: Compiled to `distribution/` (TypeScript) and `dist/` (build output)
- **Test runner**: Jest with 180s timeout, maxWorkers: 1 (sequential tests)
- **Container runtime**: Uses TestContainers with Docker for Camunda/Zeebe instances
- **Core components**: Runtime management, Docker containers, assertions, job mocking

### Key Configuration Files
- **Configuration Map**: `source/runtime/CamundaRuntimeConfigurationMap.ts` - Central configuration definition
- **Runtime Properties**: `source/runtime/CamundaRuntimeProperties.ts` - Dynamic configuration loader
- **Jest Config**: `jest.config.js` - Test configuration with 3-minute timeout for containers
- **Examples**: `examples/` directory with runnable npm scripts

## Code Style
- **Language**: TypeScript with strict mode enabled
- **Imports**: ES6 imports, use `@camunda8/sdk` for Camunda client
- **Exports**: Use `export *` pattern for index files
- **Naming**: PascalCase for classes, camelCase for functions/variables
- **Types**: Explicit TypeScript types, interfaces in `source/types/`
- **Debug**: Use `Debug` package with namespaced loggers (e.g., `camunda:test:*`)
- **Async**: Use async/await pattern consistently

## Configuration Management
- **Dynamic Configuration**: Configuration properties are defined in `CamundaRuntimeConfigurationMap.ts`
- **Type Safety**: Properties are automatically derived from configuration map using TypeScript utility types
- **Extensibility**: Add new configuration properties by adding entries to the configuration map
- **Single Source of Truth**: All configuration changes happen in one place

## API Usage
- **Assertions**: Use `PollingOperation` from `@camunda8/sdk` for polling-based assertions
- **Process Instance Queries**: Use `CamundaRestClient.searchProcessInstances` for real-time process state checking
- **Type Safety**: Leverage TypeScript types from `@camunda8/sdk` for API parameters and responses
