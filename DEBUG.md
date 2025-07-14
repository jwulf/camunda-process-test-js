# 🐛 Debug Mode Guide

This guide shows how to enable verbose debugging information for Camunda Process Test to inspect Docker container operations, process deployments, and test execution steps.

## 🚀 Quick Start

Enable debug mode by setting the `DEBUG` environment variable:

```bash
# Enable all debugging
DEBUG=camunda:* npm test examples/debug.test.ts

# Enable only container operations
DEBUG=camunda:test:container npm test examples/debug.test.ts
```

## 📊 Debug Categories

| Category | Description | What You'll See |
|----------|-------------|-----------------|
| `camunda:test:runtime` | Runtime lifecycle | 🚀 Container startup/shutdown sequence |
| `camunda:test:container` | Container operations | 🐳 Docker container creation, ports, IDs |
| `camunda:test:docker` | Docker image info | 📥 Image pulls and versions |
| `camunda:test:extension` | Test extension lifecycle | 🏗️ Setup and teardown phases |
| `camunda:test:context` | Test context operations | 🧪 Context initialization and cleanup |
| `camunda:test:deploy` | Process/decision deployments | 📋 BPMN/DMN deployment details |
| `camunda:test:worker` | Job worker operations | 🔧 Worker creation and registration |
| `camunda:test:logs` | Container log capture | 📋 Log file creation and storage |

## 🔍 Common Debug Commands

### Full Verbose Mode
```bash
# Everything with timestamps (requires `ts` utility: npm install -g ts)
DEBUG=camunda:* npm test examples/debug.test.ts 2>&1 | ts '[%Y-%m-%d %H:%M:%S]'
```

### Container-Focused Debugging
```bash
# See Docker operations in detail
DEBUG=camunda:test:container,camunda:test:docker npm test examples/debug.test.ts
```

### Deployment Debugging
```bash
# Focus on process and decision deployments
DEBUG=camunda:test:deploy,camunda:test:context npm test examples/debug.test.ts
```

### Runtime Only
```bash
# High-level runtime operations
DEBUG=camunda:test:runtime,camunda:test:extension npm test examples/debug.test.ts
```

### Container Log Capture
```bash
# Enable log capture (automatic when any debug mode is enabled)
DEBUG=camunda:test:logs npm test examples/simple.test.ts

# Logs are saved to ./camunda-test-logs/ directory
# Files: elasticsearch-{timestamp}.log, zeebe-{timestamp}.log, connectors-{timestamp}.log
```

## 📋 Sample Debug Output

When you run with debugging enabled, you'll see output like:

```
camunda:test:extension 🏗️ Setting up Camunda Process Test environment... +0ms
camunda:test:extension 📋 Configuration loaded: { camundaDockerImageName: 'camunda/zeebe', camundaDockerImageVersion: '8.7.0', runtimeMode: 'MANAGED' } +2ms
camunda:test:runtime 🚀 Starting Camunda runtime... +0ms
camunda:test:runtime 🐳 Using MANAGED mode (Docker containers) +1ms
camunda:test:container 🔍 Starting Elasticsearch container... +0ms
camunda:test:docker 📥 Pulling image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0 +1ms
camunda:test:container 🏃 Starting Elasticsearch container... +15s
camunda:test:container ✅ Elasticsearch started successfully on port 32768 +12s
camunda:test:container 📍 Elasticsearch URL: http://localhost:32768 +0ms
camunda:test:container ⚙️ Starting Zeebe container... +1ms
camunda:test:docker 📥 Pulling image: camunda/zeebe:8.7.0 +0ms
camunda:test:container 🔗 Connecting to Elasticsearch on port 32768 +0ms
camunda:test:container 🏃 Starting Zeebe container (this may take a while for first run)... +25s
camunda:test:container ✅ Zeebe started successfully +45s
camunda:test:container 📍 Gateway address: localhost:32769 +0ms
camunda:test:container 📍 Management port: 32770 +0ms
camunda:test:container 📍 Container ID: abc123def456 +0ms
camunda:test:deploy 📋 Deploying BPMN process from: ./examples/resources/simple-process.bpmn +2s
camunda:test:deploy ✅ Process deployed successfully +150ms
camunda:test:deploy 📍 Process Definition Key: 2251799813685249 +0ms
camunda:test:deploy 📍 Process ID: simple-process +0ms
camunda:test:deploy 📍 Version: 1 +0ms
```

## ⚡ Performance Tips

### First Run vs Subsequent Runs
- **First run**: Takes 2-5 minutes (Docker image downloads)
- **Subsequent runs**: ~30-60 seconds (images cached)

### Debug Output Performance
- Debugging adds minimal overhead (~5-10% slower)
- Use specific categories to reduce noise
- Pipe to file for analysis: `DEBUG=camunda:* npm test > debug.log 2>&1`

## 🛠️ Troubleshooting

### Container Startup Issues
```bash
# Check Docker is running
docker ps

# Debug container creation
DEBUG=camunda:test:container,camunda:test:docker npm test examples/debug.test.ts

# Check for port conflicts
DEBUG=camunda:test:container npm test examples/debug.test.ts | grep "port"
```

### Image Pull Problems
```bash
# Check Docker registry connectivity
DEBUG=camunda:test:docker npm test examples/debug.test.ts

# Manually pull images to test
docker pull camunda/zeebe:8.7.0
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

### Process Deployment Issues
```bash
# Debug process deployment
DEBUG=camunda:test:deploy npm test examples/debug.test.ts

# Check file paths
ls -la examples/resources/*.bpmn
```

## 🎯 Advanced Debugging

### Custom Debug Configuration
```typescript
// In your test file
process.env.DEBUG = 'camunda:test:container,camunda:test:deploy';

// Or use programmatic configuration
import Debug from 'debug';
Debug.enabled = (name) => name.startsWith('camunda:test:');
```

### Environment Variables
```bash
# Control Camunda container logging
DEBUG=camunda:* CAMUNDA_LOG_LEVEL=debug npm test

# Use specific Docker image versions
DEBUG=camunda:* CAMUNDA_DOCKER_IMAGE_VERSION=8.6.0 npm test

# Force container recreation
DEBUG=camunda:* npm test -- --forceExit --detectOpenHandles
```

### Debugging in CI/CD
```yaml
# GitHub Actions example
- name: Run Camunda tests with debugging
  run: DEBUG=camunda:test:container,camunda:test:runtime npm test
  env:
    FORCE_COLOR: 1
```

## 📖 Example Files

- [`examples/debug.test.ts`](examples/debug.test.ts) - Comprehensive debug example
- [`examples/simple.test.ts`](examples/simple.test.ts) - Basic test with debug support

## 🔗 Related

- [Main README](README.md) - General usage and API
- [Jest Configuration](jest.config.js) - Test timeout and setup
- [Container Configuration](source/runtime/CamundaProcessTestRuntime.ts) - Runtime settings
