import fs from 'fs'
import path from 'path'

import Debug from 'debug'

import {
	CAMUNDA_RUNTIME_CONFIGURATION,
	getConfigurationProperty,
	getSimpleProperties,
	getVersionResolverProperties,
	type CamundaRuntimeConfigType,
	type ConfigurationProperty,
	type PropertiesFromConfig,
} from './CamundaRuntimeConfigurationMap'

const debug = Debug('camunda:test:properties')

// Derive properties interface from configuration map - make it flexible for runtime
type Properties = {
	[K in keyof PropertiesFromConfig<CamundaRuntimeConfigType>]: PropertiesFromConfig<CamundaRuntimeConfigType>[K] extends
		| 'MANAGED'
		| 'REMOTE'
		? 'MANAGED' | 'REMOTE'
		: string
}

export class ContainerRuntimePropertiesUtil implements Properties {
	public static RUNTIME_PROPERTIES_FILE = 'camunda-test-config.json'
	public static SNAPSHOT_VERSION = 'SNAPSHOT' as const

	private static PLACEHOLDER_PATTERN = /\$\{.*\}/

	// Dynamic property declarations - these are generated at runtime
	public camundaVersion!: Properties['camundaVersion']
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
	public zeebeTokenAudience!: Properties['zeebeTokenAudience']
	public camundaAuthStrategy!: Properties['camundaAuthStrategy']
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
			ContainerRuntimePropertiesUtil.readPropertiesFile()
		)
	}

	private static readPropertiesFile(): Partial<Properties> {
		let properties: Partial<Properties> = {}
		const projectRoot = getProjectRoot()
		const configPath = path.join(
			projectRoot,
			ContainerRuntimePropertiesUtil.RUNTIME_PROPERTIES_FILE
		)

		try {
			properties = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
			debug(`Loaded properties from ${configPath}`, properties)
		} catch (e) {
			console.warn(`Can't read properties file: ${configPath}`)
		}
		return properties
	}
}

function getProjectRoot(): string {
	// Start from current working directory
	let currentDir = process.cwd()

	while (currentDir !== path.parse(currentDir).root) {
		if (fs.existsSync(path.join(currentDir, 'package.json'))) {
			return currentDir
		}
		currentDir = path.dirname(currentDir)
	}

	throw new Error('Project root not found')
}
