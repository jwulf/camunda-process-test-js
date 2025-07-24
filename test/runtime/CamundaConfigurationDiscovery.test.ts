import fs from 'fs'
import { tmpdir } from 'os'
import path from 'path'

import { CamundaConfigurationDiscovery } from '../../source/runtime/CamundaConfigurationDiscovery'

describe('CamundaConfigurationDiscovery', () => {
	let tempDir: string
	let originalCwd: string
	let originalEnv: string | undefined

	beforeEach(() => {
		// Create a temporary directory for each test
		tempDir = fs.mkdtempSync(path.join(tmpdir(), 'camunda-config-test-'))
		originalCwd = process.cwd()
		originalEnv = process.env.CAMUNDA_TEST_CONFIG_FILE

		// Clean up environment variable
		delete process.env.CAMUNDA_TEST_CONFIG_FILE
	})

	afterEach(() => {
		// Restore original working directory and environment
		process.chdir(originalCwd)
		if (originalEnv !== undefined) {
			process.env.CAMUNDA_TEST_CONFIG_FILE = originalEnv
		} else {
			delete process.env.CAMUNDA_TEST_CONFIG_FILE
		}

		// Clean up temporary directory
		fs.rmSync(tempDir, { recursive: true, force: true })
	})

	describe('Environment Variable Override', () => {
		it('should use specific config file when CAMUNDA_TEST_CONFIG_FILE is set', () => {
			// Setup
			const projectRoot = tempDir
			const configPath = path.join(projectRoot, 'custom-config.json')
			const config = {
				runtimeMode: 'REMOTE',
				zeebeRestAddress: 'http://localhost:8080',
			}

			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

			process.chdir(projectRoot)
			process.env.CAMUNDA_TEST_CONFIG_FILE = 'custom-config.json'

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert
			expect(result).toEqual(config)
		})

		it('should resolve absolute paths correctly', () => {
			// Setup
			const projectRoot = tempDir
			const configPath = path.join(projectRoot, 'absolute-config.json')
			const config = { camundaDockerImageVersion: '8.8.0' }

			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

			process.chdir(projectRoot)
			process.env.CAMUNDA_TEST_CONFIG_FILE = configPath // absolute path

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert
			expect(result).toEqual(config)
		})

		it('should fail fast when specified config file does not exist', () => {
			// Setup
			const projectRoot = tempDir
			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')

			process.chdir(projectRoot)
			process.env.CAMUNDA_TEST_CONFIG_FILE = 'non-existent.json'

			// Act & Assert
			expect(() => {
				CamundaConfigurationDiscovery.resolveConfiguration()
			}).toThrow(/Camunda test configuration file not found/)
		})

		it('should fail fast when specified config file has invalid JSON', () => {
			// Setup
			const projectRoot = tempDir
			const configPath = path.join(projectRoot, 'invalid.json')

			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(configPath, '{ invalid json }')

			process.chdir(projectRoot)
			process.env.CAMUNDA_TEST_CONFIG_FILE = 'invalid.json'

			// Act & Assert
			expect(() => {
				CamundaConfigurationDiscovery.resolveConfiguration()
			}).toThrow(/Failed to parse Camunda test configuration file/)
		})

		it('should include available config files in error message', () => {
			// Setup
			const projectRoot = tempDir
			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(path.join(projectRoot, 'camunda-test-config.json'), '{}')

			// Create configs directory with some files
			const configsDir = path.join(projectRoot, 'configs')
			fs.mkdirSync(configsDir)
			fs.writeFileSync(path.join(configsDir, 'staging.json'), '{}')
			fs.writeFileSync(path.join(configsDir, 'production.json'), '{}')

			process.chdir(projectRoot)
			process.env.CAMUNDA_TEST_CONFIG_FILE = 'missing.json'

			// Act & Assert
			expect(() => {
				CamundaConfigurationDiscovery.resolveConfiguration()
			}).toThrow(/Available configuration files:/)
		})
	})

	describe('Project Root Discovery', () => {
		it('should return empty config when no files are found', () => {
			// Setup
			const projectRoot = tempDir
			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			process.chdir(projectRoot)

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert
			expect(result).toEqual({})
		})

		it('should load single config file from project root', () => {
			// Setup
			const projectRoot = tempDir
			const config = { runtimeMode: 'MANAGED' }

			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(
				path.join(projectRoot, 'camunda-test-config.json'),
				JSON.stringify(config, null, 2)
			)

			process.chdir(projectRoot)

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert
			expect(result).toEqual(config)
		})

		it('should load project root config only (no hierarchical merging)', () => {
			// Setup directory structure:
			// tempDir/
			//   package.json
			//   camunda-test-config.json (only this should be loaded)
			//   test/
			//     camunda-test-config.json (this should be ignored)
			//     unit/ (working directory)

			const projectRoot = tempDir
			const testDir = path.join(projectRoot, 'test')
			const unitDir = path.join(testDir, 'unit')

			fs.mkdirSync(testDir)
			fs.mkdirSync(unitDir)

			const rootConfig = {
				runtimeMode: 'MANAGED',
				camundaDockerImageVersion: '8.8.0',
			}
			const testConfig = {
				runtimeMode: 'REMOTE',
				zeebeRestAddress: 'http://localhost:8080',
			}

			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(
				path.join(projectRoot, 'camunda-test-config.json'),
				JSON.stringify(rootConfig, null, 2)
			)
			fs.writeFileSync(
				path.join(testDir, 'camunda-test-config.json'),
				JSON.stringify(testConfig, null, 2)
			)

			process.chdir(unitDir)

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert - only root config should be loaded
			expect(result).toEqual(rootConfig)
		})

		it('should load project root config only (no multi-level hierarchy)', () => {
			// Setup directory structure with multiple config files
			// tempDir/
			//   package.json
			//   camunda-test-config.json (only this should be loaded)
			//   test/
			//     camunda-test-config.json (ignored)
			//     integration/
			//       camunda-test-config.json (ignored)
			//       api/ (working directory)

			const projectRoot = tempDir
			const testDir = path.join(projectRoot, 'test')
			const integrationDir = path.join(testDir, 'integration')
			const apiDir = path.join(integrationDir, 'api')

			fs.mkdirSync(testDir)
			fs.mkdirSync(integrationDir)
			fs.mkdirSync(apiDir)

			const rootConfig = {
				runtimeMode: 'MANAGED',
				camundaDockerImageVersion: '8.8.0',
				description: 'root',
			}
			const testConfig = {
				runtimeMode: 'REMOTE',
				description: 'test',
			}
			const integrationConfig = {
				zeebeRestAddress: 'http://localhost:8080',
				description: 'integration',
			}

			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(
				path.join(projectRoot, 'camunda-test-config.json'),
				JSON.stringify(rootConfig, null, 2)
			)
			fs.writeFileSync(
				path.join(testDir, 'camunda-test-config.json'),
				JSON.stringify(testConfig, null, 2)
			)
			fs.writeFileSync(
				path.join(integrationDir, 'camunda-test-config.json'),
				JSON.stringify(integrationConfig, null, 2)
			)

			process.chdir(apiDir)

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert - only root config should be loaded
			expect(result).toEqual(rootConfig)
		})

		it('should skip invalid JSON files and continue discovery', () => {
			// Setup
			const projectRoot = tempDir
			const testDir = path.join(projectRoot, 'test')

			fs.mkdirSync(testDir)

			const validConfig = { runtimeMode: 'MANAGED' }

			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')
			fs.writeFileSync(
				path.join(projectRoot, 'camunda-test-config.json'),
				JSON.stringify(validConfig, null, 2)
			)
			fs.writeFileSync(
				path.join(testDir, 'camunda-test-config.json'),
				'{ invalid json }'
			)

			process.chdir(testDir)

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert - should still get valid config from parent
			expect(result).toEqual(validConfig)
		})
	})

	describe('Package.json Detection', () => {
		it('should throw error when no package.json is found', () => {
			// Setup - create directory without package.json
			const invalidProjectDir = tempDir
			process.chdir(invalidProjectDir)

			// Act & Assert
			expect(() => {
				CamundaConfigurationDiscovery.resolveConfiguration()
			}).toThrow(/Project root not found/)
		})

		it('should find project root in parent directories', () => {
			// Setup
			const projectRoot = tempDir
			const deepDir = path.join(projectRoot, 'a', 'b', 'c', 'd')

			fs.mkdirSync(deepDir, { recursive: true })
			fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}')

			const config = { runtimeMode: 'MANAGED' }
			fs.writeFileSync(
				path.join(projectRoot, 'camunda-test-config.json'),
				JSON.stringify(config, null, 2)
			)

			process.chdir(deepDir)

			// Act
			const result = CamundaConfigurationDiscovery.resolveConfiguration()

			// Assert
			expect(result).toEqual(config)
		})
	})
})
