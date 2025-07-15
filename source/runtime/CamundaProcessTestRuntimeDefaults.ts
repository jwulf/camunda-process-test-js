import { ContainerRuntimePorts } from './CamundaRuntimePorts'

export class CamundaProcessTestRuntimeDefaults {
	public static DEFAULT_CAMUNDA_DOCKER_IMAGE_NAME = 'camunda/camunda'
	public static DEFAULT_CAMUNDA_DOCKER_IMAGE_VERSION = 'SNAPSHOT'
	public static DEFAULT_CONNECTORS_DOCKER_IMAGE_NAME =
		'camunda/connectors-bundle'
	public static DEFAULT_CONNECTORS_DOCKER_IMAGE_VERSION = 'SNAPSHOT'

	public static LOCAL_CAMUNDA_MONITORING_API_ADDRESS =
		'http://0.0.0.0:' + ContainerRuntimePorts.CAMUNDA_MONITORING_API
	public static LOCAL_CONNECTORS_REST_API_ADDRESS = 'http://0.0.0.0:8085'
	public static RUNTIME_MODE = 'MANAGED' as const
}
