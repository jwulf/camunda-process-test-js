import {
	CAMUNDA_RUNTIME_CONFIGURATION,
	getAllConfigurationProperties,
	getConfigurationProperty,
	getSimpleProperties,
	getVersionResolverProperties,
} from '../../source/runtime/CamundaRuntimeConfigurationMap'
import { ContainerRuntimePropertiesUtil } from '../../source/runtime/CamundaRuntimeProperties'

describe('ContainerRuntimePropertiesUtil', () => {
	describe('getPropertyOrDefault', () => {
		// Use reflection to access the private method for testing
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const getPropertyOrDefault = (ContainerRuntimePropertiesUtil as any)
			.getPropertyOrDefault

		const mockPropertyName = {
			jsonKey: 'camundaDockerImageName' as const,
			envKey: 'CAMUNDA_DOCKER_IMAGE_NAME',
		}

		const mockDefaultValue = 'default-image-name'

		beforeEach(() => {
			// Clear environment variables
			delete process.env[mockPropertyName.envKey]
		})

		afterEach(() => {
			// Clean up environment variables
			delete process.env[mockPropertyName.envKey]
		})

		it('should return default value when environment variable is null and property is null', () => {
			const versionProperties = {}

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(mockDefaultValue)
		})

		it('should return default value when environment variable is null and property is undefined', () => {
			const versionProperties = { camundaDockerImageName: undefined }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(mockDefaultValue)
		})

		it('should return default value when environment variable is null and property is a placeholder', () => {
			const versionProperties = { camundaDockerImageName: '${PLACEHOLDER}' }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(mockDefaultValue)
		})

		it('should return environment variable value when set, regardless of property value', () => {
			const envValue = 'env-image-name'
			process.env[mockPropertyName.envKey] = envValue
			const versionProperties = { camundaDockerImageName: 'config-image-name' }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(envValue)
		})

		it('should return environment variable value when set and property is null', () => {
			const envValue = 'env-image-name'
			process.env[mockPropertyName.envKey] = envValue
			const versionProperties = {}

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(envValue)
		})

		it('should return environment variable value when set and property is placeholder', () => {
			const envValue = 'env-image-name'
			process.env[mockPropertyName.envKey] = envValue
			const versionProperties = { camundaDockerImageName: '${PLACEHOLDER}' }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(envValue)
		})

		it('should return property value when environment variable is null and property is valid', () => {
			const propertyValue = 'config-image-name'
			const versionProperties = { camundaDockerImageName: propertyValue }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(propertyValue)
		})

		it('should return default value when environment variable is null and property is empty string', () => {
			const versionProperties = { camundaDockerImageName: '' }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(mockDefaultValue)
		})

		it('should return environment variable when set to empty string', () => {
			process.env[mockPropertyName.envKey] = ''
			const versionProperties = { camundaDockerImageName: 'config-image-name' }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe('')
		})

		it('should handle complex placeholder patterns', () => {
			const versionProperties = {
				camundaDockerImageName: '${ENV_VAR:-default}',
			}

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(mockDefaultValue)
		})

		it('should handle nested placeholder patterns', () => {
			const versionProperties = { camundaDockerImageName: '${FOO_${BAR}_BAZ}' }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(mockDefaultValue)
		})

		it('should return property value when it looks like placeholder but is not', () => {
			const propertyValue = 'image-name-{version}'
			const versionProperties = { camundaDockerImageName: propertyValue }

			const result = getPropertyOrDefault(
				versionProperties,
				mockPropertyName,
				mockDefaultValue
			)

			expect(result).toBe(propertyValue)
		})
	})

	describe('Configuration Map Integration', () => {
		it('should use configuration map for property resolution', () => {
			const properties = new ContainerRuntimePropertiesUtil({
				camundaDockerImageName: 'test-image',
				camundaDockerImageVersion: '1.0.0',
				runtimeMode: 'REMOTE',
			})

			expect(properties.camundaDockerImageName).toBe('test-image')
			expect(properties.camundaDockerImageVersion).toBe('1.0.0')
			expect(properties.runtimeMode).toBe('REMOTE')
		})

		it('should use default values from configuration map when properties are not provided', () => {
			const properties = new ContainerRuntimePropertiesUtil({})

			expect(properties.camundaDockerImageName).toBe('camunda/camunda')
			expect(properties.camundaDockerImageVersion).toBe('SNAPSHOT')
			expect(properties.connectorsDockerImageName).toBe(
				'camunda/connectors-bundle'
			)
			expect(properties.connectorsDockerImageVersion).toBe('SNAPSHOT')
			expect(properties.runtimeMode).toBe('MANAGED')
		})

		it('should provide static methods to access configuration', () => {
			const config = ContainerRuntimePropertiesUtil.getPropertyConfiguration(
				'camundaDockerImageName'
			)
			expect(config).toBeDefined()
			expect(config?.jsonKey).toBe('camundaDockerImageName')
			expect(config?.envKey).toBe('CAMUNDA_DOCKER_IMAGE_NAME')
			expect(config?.defaultValue).toBe('camunda/camunda')
		})

		it('should provide access to all configurations', () => {
			const allConfigs = ContainerRuntimePropertiesUtil.getAllConfigurations()
			expect(allConfigs).toEqual(CAMUNDA_RUNTIME_CONFIGURATION)
			expect(Object.keys(allConfigs)).toContain('camundaDockerImageName')
			expect(Object.keys(allConfigs)).toContain('runtimeMode')
		})
	})

	describe('Configuration Map Functions', () => {
		it('should get configuration property by key', () => {
			const config = getConfigurationProperty('camundaDockerImageName')
			expect(config).toBeDefined()
			expect(config?.jsonKey).toBe('camundaDockerImageName')
			expect(config?.envKey).toBe('CAMUNDA_DOCKER_IMAGE_NAME')
			expect(config?.description).toContain('Docker image name')
		})

		it('should return undefined for non-existent configuration property', () => {
			const config = getConfigurationProperty('nonExistentProperty')
			expect(config).toBeUndefined()
		})

		it('should get all configuration properties', () => {
			const allConfigs = getAllConfigurationProperties()
			expect(allConfigs).toEqual(CAMUNDA_RUNTIME_CONFIGURATION)
			expect(Object.keys(allConfigs).length).toBeGreaterThan(0)
		})

		it('should separate version resolver properties from simple properties', () => {
			const versionProperties = getVersionResolverProperties()
			const simpleProperties = getSimpleProperties()

			// Version resolver properties should include version-related configs
			expect(versionProperties['camundaVersion']).toBeDefined()
			expect(versionProperties['camundaVersion'].useVersionResolver).toBe(true)

			// Simple properties should include non-version configs
			expect(simpleProperties['camundaDockerImageName']).toBeDefined()
			expect(
				simpleProperties['camundaDockerImageName'].useVersionResolver
			).toBeFalsy()

			// Ensure no overlap
			const versionKeys = Object.keys(versionProperties)
			const simpleKeys = Object.keys(simpleProperties)
			const intersection = versionKeys.filter((key) => simpleKeys.includes(key))
			expect(intersection).toHaveLength(0)
		})

		it('should have proper configuration structure', () => {
			const config = getConfigurationProperty('runtimeMode')
			expect(config).toBeDefined()
			expect(config?.jsonKey).toBe('runtimeMode')
			expect(config?.envKey).toBe('CAMUNDA_RUNTIME_MODE')
			expect(config?.defaultValue).toBe('MANAGED')
			expect(config?.description).toContain('Runtime mode')
			expect(config?.useVersionResolver).toBeFalsy()
		})
	})
})
