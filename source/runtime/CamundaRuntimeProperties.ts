import { CamundaConfigurationDiscovery } from './CamundaConfigurationDiscovery'
import {
	CAMUNDA_RUNTIME_CONFIGURATION,
	getConfigurationProperty,
	getSimpleProperties,
	getVersionResolverProperties,
	type CamundaRuntimeConfigType,
	type ConfigurationProperty,
	type PropertiesFromConfig,
} from './CamundaRuntimeConfigurationMap'

// Derive properties interface from configuration map - make it flexible for runtime
type Properties = {
	[K in keyof PropertiesFromConfig<CamundaRuntimeConfigType>]: PropertiesFromConfig<CamundaRuntimeConfigType>[K] extends
		| 'MANAGED'
		| 'REMOTE'
		? 'MANAGED' | 'REMOTE'
		: PropertiesFromConfig<CamundaRuntimeConfigType>[K] extends
					| 'SAAS'
					| 'C8RUN'
					| 'SELF_MANAGED'
			? 'SAAS' | 'C8RUN' | 'SELF_MANAGED'
			: string
}

export class ContainerRuntimePropertiesUtil implements Properties {
	public static RUNTIME_PROPERTIES_FILE = 'camunda-test-config.json'
	public static SNAPSHOT_VERSION = 'SNAPSHOT' as const

	private static PLACEHOLDER_PATTERN = /\$\{.*\}/

	// Dynamic property declarations - these are generated at runtime
	public camundaDockerImageName!: Properties['camundaDockerImageName']
	public camundaDockerImageVersion!: Properties['camundaDockerImageVersion']
	public connectorsDockerImageName!: Properties['connectorsDockerImageName']
	public connectorsDockerImageVersion!: Properties['connectorsDockerImageVersion']
	public runtimeMode!: Properties['runtimeMode']
	// Remote connection properties
	public zeebeClientId!: Properties['zeebeClientId']
	public zeebeClientSecret!: Properties['zeebeClientSecret']
	public camundaOauthUrl!: Properties['camundaOauthUrl']
	public zeebeRestAddress!: Properties['zeebeRestAddress']
	public zeebeGrpcAddress!: Properties['zeebeGrpcAddress']
	public zeebeTokenAudience!: Properties['zeebeTokenAudience']
	public zeebeClientLogLevel!: Properties['zeebeClientLogLevel']
	public camundaAuthStrategy!: Properties['camundaAuthStrategy']
	public flushProcesses!: Properties['flushProcesses']
	public camundaMonitoringApiAddress!: Properties['camundaMonitoringApiAddress']
	public connectorsRestApiAddress!: Properties['connectorsRestApiAddress']

	constructor(properties: Partial<Properties> = {}) {
		// Initialize all properties dynamically using the configuration map
		Object.keys(CAMUNDA_RUNTIME_CONFIGURATION).forEach((key) => {
			const typedKey = key as keyof Properties
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			;(this as any)[typedKey] = this.resolveProperty(key, properties)
		})
	}

	/**
	 * Resolve a property value using the configuration map.
	 */
	private resolveProperty(
		propertyKey: string,
		properties: Partial<Properties>
	): string {
		const config = getConfigurationProperty(propertyKey)
		if (!config) {
			throw new Error(`Unknown configuration property: ${propertyKey}`)
		}

		const propertyName = {
			jsonKey: config.jsonKey as keyof Properties,
			envKey: config.envKey,
		}

		if (config.useVersionResolver) {
			return ContainerRuntimePropertiesUtil.getLatestReleasedVersion(
				properties,
				propertyName,
				config.defaultValue
			)
		} else {
			return ContainerRuntimePropertiesUtil.getPropertyOrDefault(
				properties,
				propertyName,
				config.defaultValue
			)
		}
	}

	/**
	 * Get property configuration for a given key.
	 */
	public static getPropertyConfiguration(
		key: string
	): ConfigurationProperty | undefined {
		return getConfigurationProperty(key)
	}

	/**
	 * Get all available configuration properties.
	 */
	public static getAllConfigurations() {
		return CAMUNDA_RUNTIME_CONFIGURATION
	}

	/**
	 * Get properties that use version resolution.
	 */
	public static getVersionProperties() {
		return getVersionResolverProperties()
	}

	/**
	 * Get properties that use simple resolution.
	 */
	public static getSimpleProperties() {
		return getSimpleProperties()
	}

	private static getLatestReleasedVersion(
		properties: Partial<Properties>,
		propertyName: { jsonKey: keyof Properties },
		defaultValue: string
	): string {
		const propertyValue = properties[propertyName.jsonKey]
		if (propertyValue == null || this.isPlaceholder(propertyValue)) {
			return defaultValue
		}

		return propertyValue
	}

	private static isPlaceholder(propertyValue: string): boolean {
		return propertyValue == null || this.PLACEHOLDER_PATTERN.test(propertyValue)
	}

	/**
	 * This should return the property value from the environment variable or version properties.
	 */
	private static getPropertyOrDefault(
		versionProperties: Partial<Properties>,
		propertyName: { jsonKey: keyof Properties; envKey: string },
		defaultValue: string
	): string {
		const propertyValue = versionProperties[propertyName.jsonKey]
		if (
			process.env[propertyName.envKey] == null &&
			(propertyValue == null ||
				ContainerRuntimePropertiesUtil.isPlaceholder(propertyValue))
		) {
			return defaultValue
		} else {
			return process.env[propertyName.envKey] ?? (propertyValue || defaultValue)
		}
	}

	public static readProperties(): ContainerRuntimePropertiesUtil {
		return new ContainerRuntimePropertiesUtil(
			CamundaConfigurationDiscovery.resolveConfiguration()
		)
	}

	private static readPropertiesFile(): Partial<Properties> {
		// This method is now deprecated - use CamundaConfigurationDiscovery instead
		// Keeping for backward compatibility in case any tests directly call it
		return CamundaConfigurationDiscovery.resolveConfiguration()
	}
}
