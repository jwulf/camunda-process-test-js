import type { ConfigurationProperty } from '../../source/runtime/CamundaRuntimeConfigurationMap'
import {
	CAMUNDA_RUNTIME_CONFIGURATION,
	getAllConfigurationProperties,
	getConfigurationProperty,
	getSimpleProperties,
	getVersionResolverProperties,
} from '../../source/runtime/CamundaRuntimeConfigurationMap'

describe('CamundaRuntimeConfigurationMap', () => {
	describe('Configuration Structure', () => {
		it('should have all required properties for each configuration', () => {
			const configs = getAllConfigurationProperties()

			Object.entries(configs).forEach(([, config]) => {
				expect(config).toBeDefined()
				expect(config.jsonKey).toBeDefined()
				expect(config.envKey).toBeDefined()
				expect(config.defaultValue).toBeDefined()
				expect(config.description).toBeDefined()
				expect(typeof config.jsonKey).toBe('string')
				expect(typeof config.envKey).toBe('string')
				expect(typeof config.defaultValue).toBe('string')
				expect(typeof config.description).toBe('string')
			})
		})

		it('should have consistent naming between key and jsonKey', () => {
			Object.entries(CAMUNDA_RUNTIME_CONFIGURATION).forEach(([key, config]) => {
				expect(config.jsonKey).toBe(key)
			})
		})

		it('should have meaningful descriptions', () => {
			Object.entries(CAMUNDA_RUNTIME_CONFIGURATION).forEach(([key, config]) => {
				expect(config.description.length).toBeGreaterThan(10)
				expect(config.description).not.toBe(key)
			})
		})

		it('should have proper environment variable naming', () => {
			Object.entries(CAMUNDA_RUNTIME_CONFIGURATION).forEach(([, config]) => {
				expect(config.envKey).toMatch(/^[A-Z_]+$/)
				expect(config.envKey.length).toBeGreaterThan(3)
			})
		})
	})

	describe('Configuration Categories', () => {
		it('should categorize version resolver properties correctly', () => {
			const versionProperties = getVersionResolverProperties()
			const expectedVersionProperties = [
				'camundaDockerImageVersion',
				'connectorsDockerImageVersion',
			]

			expectedVersionProperties.forEach((prop) => {
				expect(versionProperties[prop]).toBeDefined()
				expect(versionProperties[prop].useVersionResolver).toBe(true)
			})
		})

		it('should categorize simple properties correctly', () => {
			const simpleProperties = getSimpleProperties()
			const expectedSimpleProperties = [
				'camundaDockerImageName',
				'connectorsDockerImageName',
				'runtimeMode',
			]

			expectedSimpleProperties.forEach((prop) => {
				expect(simpleProperties[prop]).toBeDefined()
				expect(simpleProperties[prop].useVersionResolver).toBeFalsy()
			})
		})

		it('should have all properties in either version or simple category', () => {
			const allProperties = getAllConfigurationProperties()
			const versionProperties = getVersionResolverProperties()
			const simpleProperties = getSimpleProperties()

			const allKeys = Object.keys(allProperties)
			const versionKeys = Object.keys(versionProperties)
			const simpleKeys = Object.keys(simpleProperties)

			expect(versionKeys.length + simpleKeys.length).toBe(allKeys.length)

			allKeys.forEach((key) => {
				expect(versionKeys.includes(key) || simpleKeys.includes(key)).toBe(true)
			})
		})
	})

	describe('Configuration Extensibility', () => {
		it('should be easy to add new configuration properties', () => {
			// This test demonstrates how easy it is to understand the structure
			const testConfig: ConfigurationProperty = {
				jsonKey: 'testProperty',
				envKey: 'TEST_PROPERTY',
				defaultValue: 'default-test-value',
				description: 'Test property for demonstration',
				useVersionResolver: false,
			}

			// Verify the structure is correct
			expect(testConfig.jsonKey).toBe('testProperty')
			expect(testConfig.envKey).toBe('TEST_PROPERTY')
			expect(testConfig.defaultValue).toBe('default-test-value')
			expect(testConfig.description).toBe('Test property for demonstration')
			expect(testConfig.useVersionResolver).toBe(false)
		})

		it('should provide helper functions for configuration access', () => {
			// Test all helper functions work correctly
			const config = getConfigurationProperty('camundaDockerImageName')
			expect(config).toBeDefined()

			const allConfigs = getAllConfigurationProperties()
			expect(Object.keys(allConfigs).length).toBeGreaterThan(0)

			const versionConfigs = getVersionResolverProperties()
			expect(Object.keys(versionConfigs).length).toBeGreaterThan(0)

			const simpleConfigs = getSimpleProperties()
			expect(Object.keys(simpleConfigs).length).toBeGreaterThan(0)
		})
	})

	describe('Human Readability', () => {
		it('should provide clear configuration reference', () => {
			const configs = getAllConfigurationProperties()

			// Generate a human-readable reference (this could be exported as documentation)
			const reference = Object.entries(configs).map(([key, config]) => ({
				property: key,
				jsonKey: config.jsonKey,
				environmentVariable: config.envKey,
				defaultValue: config.defaultValue,
				description: config.description,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				type: (config as any).useVersionResolver
					? 'version-resolved'
					: 'simple',
			}))

			// Verify the reference structure
			expect(reference).toHaveLength(Object.keys(configs).length)
			reference.forEach((item) => {
				expect(item.property).toBeDefined()
				expect(item.jsonKey).toBeDefined()
				expect(item.environmentVariable).toBeDefined()
				expect(item.defaultValue).toBeDefined()
				expect(item.description).toBeDefined()
				expect(['version-resolved', 'simple']).toContain(item.type)
			})
		})
	})
})
