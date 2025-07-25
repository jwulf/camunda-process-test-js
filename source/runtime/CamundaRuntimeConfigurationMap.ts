/**
 * Configuration map for Camunda runtime properties.
 *
 * This file contains all configurable parameters for the Camunda Process Test runtime.
 * Each configuration property defines:
 * - jsonKey: The key used in the camunda-test-config.json file
 * - envKey: The environment variable name that overrides the JSON configuration
 * - defaultValue: The default value if neither JSON nor environment variable is set
 * - description: Human-readable description of the configuration property
 * - useVersionResolver: Whether to use version resolution logic for this property
 */

export interface ConfigurationProperty<T = string> {
	jsonKey: string
	envKey: string
	defaultValue: T
	description: string
	useVersionResolver?: boolean
}

export interface ConfigurationMap {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: ConfigurationProperty<any>
}

/**
 * Type utility to derive property types from configuration map.
 * This extracts the property keys and their corresponding types from the configuration.
 */
export type PropertiesFromConfig<T extends ConfigurationMap> = {
	[K in keyof T]: T[K] extends ConfigurationProperty<infer U> ? U : string
}

/**
 * Type utility to get a specific property type from configuration map.
 */
export type PropertyType<T extends ConfigurationMap, K extends keyof T> =
	T[K] extends ConfigurationProperty<infer U> ? U : string

/**
 * Configuration map for all Camunda runtime properties.
 *
 * To add a new configuration property:
 * 1. Add a new entry to this map with the appropriate type
 * 2. The types will be automatically derived for CamundaRuntimeProperties
 */
export const CAMUNDA_RUNTIME_CONFIGURATION = {
	// Camunda Docker Image Configuration
	camundaDockerImageName: {
		jsonKey: 'camundaDockerImageName',
		envKey: 'CAMUNDA_DOCKER_IMAGE_NAME',
		defaultValue: 'camunda/camunda',
		description: 'Docker image name for Camunda container',
	},

	camundaDockerImageVersion: {
		jsonKey: 'camundaDockerImageVersion',
		envKey: 'CAMUNDA_DOCKER_IMAGE_VERSION',
		defaultValue: '8.8.0',
		description: 'Docker image version for Camunda container (minimum 8.8.0)',
		useVersionResolver: true,
	},

	// Connectors Docker Image Configuration
	connectorsDockerImageName: {
		jsonKey: 'connectorsDockerImageName',
		envKey: 'CONNECTORS_DOCKER_IMAGE_NAME',
		defaultValue: 'camunda/connectors-bundle',
		description: 'Docker image name for Connectors container',
	},

	connectorsDockerImageVersion: {
		jsonKey: 'connectorsDockerImageVersion',
		envKey: 'CONNECTORS_DOCKER_IMAGE_VERSION',
		defaultValue: '8.8.0',
		description:
			'Docker image version for Connectors container (minimum 8.8.0)',
		useVersionResolver: true,
	},

	// Runtime Mode Configuration
	runtimeMode: {
		jsonKey: 'runtimeMode',
		envKey: 'CAMUNDA_RUNTIME_MODE',
		defaultValue: 'MANAGED' as 'MANAGED' | 'REMOTE',
		description:
			'Runtime mode: MANAGED (Docker containers) or REMOTE (existing instance)',
	},

	// Remote Connection Configuration
	zeebeClientId: {
		jsonKey: 'zeebeClientId',
		envKey: 'ZEEBE_CLIENT_ID',
		defaultValue: '',
		description:
			'Client ID for OAuth authentication with remote Camunda instance',
	},

	zeebeClientSecret: {
		jsonKey: 'zeebeClientSecret',
		envKey: 'ZEEBE_CLIENT_SECRET',
		defaultValue: '',
		description:
			'Client secret for OAuth authentication with remote Camunda instance',
	},

	camundaOauthUrl: {
		jsonKey: 'camundaOauthUrl',
		envKey: 'CAMUNDA_OAUTH_URL',
		defaultValue: '',
		description: 'OAuth URL for authentication with remote Camunda instance',
	},

	zeebeRestAddress: {
		jsonKey: 'zeebeRestAddress',
		envKey: 'ZEEBE_REST_ADDRESS',
		defaultValue: '',
		description: 'REST API address for remote Zeebe instance',
	},

	zeebeGrpcAddress: {
		jsonKey: 'zeebeGrpcAddress',
		envKey: 'ZEEBE_GRPC_ADDRESS',
		defaultValue: '',
		description: 'gRPC API address for remote Zeebe instance (for workers)',
	},

	zeebeTokenAudience: {
		jsonKey: 'zeebeTokenAudience',
		envKey: 'ZEEBE_TOKEN_AUDIENCE',
		defaultValue: '',
		description: 'Token audience for OAuth authentication',
	},

	zeebeClientLogLevel: {
		jsonKey: 'zeebeClientLogLevel',
		envKey: 'ZEEBE_CLIENT_LOG_LEVEL',
		defaultValue: 'NONE',
		description:
			'Log level for Zeebe gRPC client (NONE, ERROR, WARN, INFO, DEBUG)',
	},

	camundaAuthStrategy: {
		jsonKey: 'camundaAuthStrategy',
		envKey: 'CAMUNDA_AUTH_STRATEGY',
		defaultValue: '',
		description:
			'Authentication strategy: OAUTH, NONE, or empty for auto-detection',
	},

	// Remote API Endpoints
	camundaMonitoringApiAddress: {
		jsonKey: 'camundaMonitoringApiAddress',
		envKey: 'CAMUNDA_MONITORING_API_ADDRESS',
		defaultValue: '',
		description:
			'Monitoring API address for remote Camunda instance (defaults to REST address on port 9600)',
	},

	connectorsRestApiAddress: {
		jsonKey: 'connectorsRestApiAddress',
		envKey: 'CONNECTORS_REST_API_ADDRESS',
		defaultValue: '',
		description:
			'Connectors REST API address for remote instance (defaults to REST address on port 8085)',
	},
} as const

/**
 * Type for the configuration map
 */
export type CamundaRuntimeConfigType = typeof CAMUNDA_RUNTIME_CONFIGURATION

/**
 * Get a configuration property by key.
 *
 * @param key The configuration property key
 * @returns The configuration property or undefined if not found
 */
export function getConfigurationProperty(
	key: string
): ConfigurationProperty | undefined {
	return CAMUNDA_RUNTIME_CONFIGURATION[key as keyof CamundaRuntimeConfigType]
}

/**
 * Get all configuration properties.
 *
 * @returns All configuration properties
 */
export function getAllConfigurationProperties(): CamundaRuntimeConfigType {
	return CAMUNDA_RUNTIME_CONFIGURATION
}

/**
 * Get configuration properties that use version resolution.
 *
 * @returns Configuration properties that use version resolution
 */
export function getVersionResolverProperties(): Record<
	string,
	ConfigurationProperty
> {
	return Object.fromEntries(
		Object.entries(CAMUNDA_RUNTIME_CONFIGURATION).filter(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			([, config]) => (config as any).useVersionResolver
		)
	)
}

/**
 * Get configuration properties that use simple property resolution.
 *
 * @returns Configuration properties that use simple property resolution
 */
export function getSimpleProperties(): Record<string, ConfigurationProperty> {
	return Object.fromEntries(
		Object.entries(CAMUNDA_RUNTIME_CONFIGURATION).filter(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			([, config]) => !(config as any).useVersionResolver
		)
	)
}
