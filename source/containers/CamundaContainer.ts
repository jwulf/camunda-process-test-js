import { randomUUID } from 'node:crypto'

import { GenericContainer, Wait } from 'testcontainers'
import { StartedGenericContainer } from 'testcontainers/build/generic-container/started-generic-container'

import { ContainerRuntimeEnvs } from '../decorators/CamundaRuntimeEnvs'
import { ContainerRuntimePorts } from '../runtime/CamundaRuntimePorts'

export class CamundaContainer extends GenericContainer {
	private static DEFAULT_STARTUP_TIMEOUT = 60000 // 60 seconds
	private static DEFAULT_READINESS_TIMEOUT = 10000 // 10 seconds

	private static READY_ENDPOINT = '/actuator/health/status'
	private static TOPOLOGY_ENDPOINT = '/v2/topology'

	private static ACTIVE_SPRING_PROFILES = 'broker,consolidated-auth'
	private static LOG_APPENDER_STACKDRIVER = 'Stackdriver'

	constructor(dockerImageName: string) {
		super(dockerImageName)
		this.applyDefaultConfiguration()
	}

	private applyDefaultConfiguration() {
		return this.withWaitStrategy(this.newDefaultWaitStrategy())
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_SPRING_PROFILES_ACTIVE]:
					CamundaContainer.ACTIVE_SPRING_PROFILES,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_ZEEBE_CLOCK_CONTROLLED]: 'true',
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_ZEEBE_LOG_APPENDER]:
					CamundaContainer.LOG_APPENDER_STACKDRIVER,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_CAMUNDA_SECURITY_AUTHENTICATION_UNPROTECTED_API]:
					'true',
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_CAMUNDA_SECURITY_AUTHORIZATIONS_ENABLED]:
					'false',
			})
			.withH2()
			.withExposedPorts(
				ContainerRuntimePorts.CAMUNDA_GATEWAY_API,
				ContainerRuntimePorts.CAMUNDA_COMMAND_API,
				ContainerRuntimePorts.CAMUNDA_INTERNAL_API,
				ContainerRuntimePorts.CAMUNDA_MONITORING_API,
				ContainerRuntimePorts.CAMUNDA_REST_API
			)
	}

	public withH2() {
		return this.withEnvironment({
			[ContainerRuntimeEnvs.CAMUNDA_ENV_DATABASE_TYPE]:
				H2Configuration.DATABASE_TYPE,
		})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_CAMUNDA_DATABASE_URL]:
					H2Configuration.databaseUrl(),
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_DATABASE_USERNAME]:
					H2Configuration.DATABASE_USERNAME,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_DATABASE_PASSWORD]:
					H2Configuration.DATABASE_PASSWORD,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_ZEEBE_BROKER_EXPORTERS_RDBMS_CLASSNAME]:
					H2Configuration.ZEEBE_BROKER_EXPORTERS_RDBMS_CLASSNAME,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_FLUSH_INTERVAL]:
					H2Configuration.ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_FLUSH_INTERVAL,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_DEFAULT_HISTORY_TTL]:
					H2Configuration.ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_DEFAULT_HISTORY_TTL,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_MIN_HISTORY_CLEANUP_INTERVAL]:
					H2Configuration.ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_MIN_HISTORY_CLEANUP_INTERVAL,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_MAX_HISTORY_CLEANUP_INTERVAL]:
					H2Configuration.ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_MAX_HISTORY_CLEANUP_INTERVAL,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_LOGGING_LEVEL_IO_CAMUNDA_DB_RDBMS]:
					H2Configuration.LOGGING_LEVEL_IO_CAMUNDA_DB_RDBMS,
			})
			.withEnvironment({
				[ContainerRuntimeEnvs.CAMUNDA_ENV_LOGGING_LEVEL_ORG_MYBATIS]:
					H2Configuration.LOGGING_LEVEL_ORG_MYBATIS,
			})
	}

	public static newDefaultBrokerReadyCheck() {
		return Wait.forHttp(
			CamundaContainer.READY_ENDPOINT,
			ContainerRuntimePorts.CAMUNDA_MONITORING_API
		)
			.forStatusCodeMatching((status: number) => status >= 200 && status < 300)
			.withReadTimeout(CamundaContainer.DEFAULT_READINESS_TIMEOUT)
	}

	public static newDefaultTopologyReadyCheck() {
		return Wait.forHttp(
			CamundaContainer.TOPOLOGY_ENDPOINT,
			ContainerRuntimePorts.CAMUNDA_REST_API,
			{}
		)
			.forStatusCodeMatching((status: number) => status >= 200 && status < 300)
			.forResponsePredicate((res) => CamundaContainer.isPartitionReady(res))
			.withReadTimeout(CamundaContainer.DEFAULT_READINESS_TIMEOUT)
	}

	private static isPartitionReady(response: string) {
		return (
			response.includes('"partitionId":1') ||
			(response.includes('"partitionId": 1') &&
				(response.includes('"role":"leader"') ||
					response.includes('"role": "leader"')) &&
				(response.includes('"health":"healthy"') ||
					response.includes('"health": "healthy"')))
		)
	}

	private newDefaultWaitStrategy() {
		return Wait.forAll([
			CamundaContainer.newDefaultBrokerReadyCheck(),
			CamundaContainer.newDefaultTopologyReadyCheck(),
		]).withStartupTimeout(CamundaContainer.DEFAULT_STARTUP_TIMEOUT)
	}

	public getGrpcApiPort() {
		return (this as unknown as StartedGenericContainer).getMappedPort(
			ContainerRuntimePorts.CAMUNDA_GATEWAY_API
		)
	}

	public getRestApiPort() {
		return (this as unknown as StartedGenericContainer).getMappedPort(
			ContainerRuntimePorts.CAMUNDA_REST_API
		)
	}

	public getGrpcApiAddress() {
		return this.toUriWithPort(this.getGrpcApiPort())
	}

	public getRestApiAddress() {
		return this.toUriWithPort(this.getRestApiPort())
	}

	private toUriWithPort(port: number) {
		return (
			'http://' +
			(this as unknown as StartedGenericContainer).getHost() +
			':' +
			port
		)
	}

	public getMonitoringApiAddress() {
		return this.toUriWithPort(this.getMonitoringApiPort())
	}

	public getMonitoringApiPort() {
		return (this as unknown as StartedGenericContainer).getMappedPort(
			ContainerRuntimePorts.CAMUNDA_MONITORING_API
		)
	}
}

class H2Configuration {
	public static DATABASE_TYPE = 'rdbms'
	public static DATABASE_USERNAME = 'sa'
	public static DATABASE_PASSWORD = ''
	public static ZEEBE_BROKER_EXPORTERS_RDBMS_CLASSNAME =
		'io.camunda.exporter.rdbms.RdbmsExporter'
	public static ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_FLUSH_INTERVAL = 'PT0S'
	public static ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_DEFAULT_HISTORY_TTL = 'PT2S'
	public static ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_MIN_HISTORY_CLEANUP_INTERVAL =
		'PT2S'
	public static ZEEBE_BROKER_EXPORTERS_RDBMS_ARGS_MAX_HISTORY_CLEANUP_INTERVAL =
		'PT5S'
	public static LOGGING_LEVEL_IO_CAMUNDA_DB_RDBMS = 'INFO'
	public static LOGGING_LEVEL_ORG_MYBATIS = 'INFO'

	public static databaseUrl() {
		return `jdbc:h2:mem:cpt+${randomUUID().split('-').join('')};DB_CLOSE_DELAY=-1;MODE=PostgreSQL`
	}
}
