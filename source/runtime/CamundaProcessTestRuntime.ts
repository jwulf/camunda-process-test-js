import * as fs from 'fs'
import * as path from 'path'

import { Camunda8 } from '@camunda8/sdk'
import Debug from 'debug'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'

import { CamundaContainer } from '../containers/CamundaContainer'
import { CamundaRuntimeConfiguration } from '../types'

import { ContainerRuntimePorts } from './CamundaRuntimePorts'

const debug = Debug('camunda:test:runtime')
const debugContainer = Debug('camunda:test:container')
// const debugDocker = Debug('camunda:test:docker')
const debugLogs = Debug('camunda:test:logs')
const log = Debug('camunda:test')
log.enabled = true

/**
 * Manages the Camunda runtime for testing.
 * Supports both container-managed and remote runtime modes.
 */
export class CamundaProcessTestRuntime {
	private container?: StartedTestContainer
	private connectorsContainer?: StartedTestContainer
	private gatewayAddress?: string

	private static DEFAULT_READINESS_TIMEOUT = 10000
	private config: CamundaRuntimeConfiguration

	constructor(config: CamundaRuntimeConfiguration) {
		this.config = config
		// Create logs directory if debug mode is enabled
		if (process.env.DEBUG?.includes('camunda')) {
			this.ensureLogsDirectory()
		}
	}

	async start(): Promise<void> {
		log('🚀 Starting Camunda runtime...')
		log('Configuration: %O', this.config)

		if (this.config.runtimeMode === 'REMOTE') {
			log('📡 Using REMOTE mode')
			await this.startRemoteMode()
		} else {
			log('🐳 Using MANAGED mode (Docker containers)')
			await this.startManagedMode()
		}

		log('✅ Camunda runtime started successfully')
	}

	async stop(): Promise<void> {
		log('🛑 Stopping Camunda runtime...')

		// Log container status before capture
		debugContainer('📊 Container status before shutdown:')
		debugContainer(
			'- Zeebe: %s',
			this.container ? 'Available' : 'Not available'
		)
		debugContainer(
			'- Connectors: %s',
			this.connectorsContainer ? 'Available' : 'Not available'
		)

		// Capture logs before stopping containers
		if (process.env.DEBUG?.includes('camunda')) {
			// await this.captureLogs();
		}

		if (this.connectorsContainer) {
			log('Stopping Connectors container...')
			await this.connectorsContainer.stop()
			log('✅ Connectors container stopped')
		}
		if (this.container) {
			log('Stopping Camunda container...')
			await this.container.stop()
			log('✅ Camunda container stopped')
		}
		log('✅ Camunda runtime stopped successfully')
	}

	createClient(): Camunda8 {
		if (!this.gatewayAddress) {
			throw new Error(
				'Gateway address not available. Runtime may not be started.'
			)
		}

		log('🔌 Creating Camunda client for gateway: %s', this.gatewayAddress)

		const client = new Camunda8({
			ZEEBE_REST_ADDRESS: this.gatewayAddress.startsWith('http')
				? this.gatewayAddress
				: `http://${this.gatewayAddress}`,
			CAMUNDA_LOG_LEVEL: process.env.DEBUG ? 'debug' : 'none', // Enable Camunda logs in debug mode
			CAMUNDA_AUTH_STRATEGY:
				(process.env.CAMUNDA_AUTH_STRATEGY as 'NONE') || 'NONE',
		})

		log('✅ Camunda client created successfully')
		return client
	}

	getGatewayAddress(): string {
		if (!this.gatewayAddress) {
			throw new Error('Gateway address not available')
		}
		return this.gatewayAddress
	}

	getConnectorsAddress(): string | undefined {
		if (this.connectorsContainer) {
			const port = this.connectorsContainer.getMappedPort(8080)
			return `http://localhost:${port}`
		}
		return this.config.remote?.connectorsRestApiAddress
	}

	private async startRemoteMode(): Promise<void> {
		debug('Starting in remote mode')
		this.gatewayAddress =
			this.config.remote?.gatewayAddress || 'localhost:26500'
	}

	private async startManagedMode(): Promise<void> {
		debug('Starting in managed mode with containers')
		// Start Camunda
		await this.startCamunda()

		// Start Connectors if enabled
		if (this.config.connectorsEnabled) {
			await this.startConnectors()
		}
	}

	private async startCamunda(): Promise<void> {
		const image = `${this.config.camundaDockerImageName}:${this.config.camundaDockerImageVersion}`

		log('⚙️ Starting Camunda container...')
		log('📥 Pulling image: %s', image)

		const environment = {
			...this.config.camundaEnvVars,
		}

		log('🌍 Camunda environment variables: %O', environment)

		const container = new CamundaContainer(image)
			.withEnvironment(environment)
			.withStartupTimeout(CamundaProcessTestRuntime.DEFAULT_READINESS_TIMEOUT) // 2 minute timeout

		// Add custom exposed ports
		if (
			this.config.camundaExposedPorts &&
			this.config.camundaExposedPorts.length > 0
		) {
			log('🔌 Adding custom exposed ports: %O', this.config.camundaExposedPorts)
			this.config.camundaExposedPorts.forEach((port) => {
				container.withExposedPorts(port)
			})
		}

		log('🏃 Starting Zeebe container (this may take a while for first run)...')
		log('⏰ Container will timeout after 2 minutes if not ready')

		let tempContainer: StartedTestContainer | undefined
		try {
			// First start the container
			tempContainer = await container.start()
			this.container = tempContainer

			const gatewayPort = this.container.getMappedPort(
				ContainerRuntimePorts.CAMUNDA_REST_API
			)
			const managementPort = this.container.getMappedPort(
				ContainerRuntimePorts.CAMUNDA_MONITORING_API
			)
			this.gatewayAddress = `localhost:${gatewayPort}`

			log('✅ Zeebe started successfully')
			log('📍 Gateway address: %s', this.gatewayAddress)
			log('📍 Management port: %d', managementPort)
			log('📍 Container ID: %s', this.container.getId())

			// Capture initial logs for debugging if debug mode is enabled
			if (process.env.DEBUG?.includes('camunda')) {
				await this.captureInitialCamundaLogs()
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			log('❌ Failed to start Zeebe container: %s', errorMessage)

			// Check if this is a timeout error (container started but wait strategy failed)
			const isTimeoutError =
				errorMessage.includes('timeout') ||
				errorMessage.includes('Timeout') ||
				errorMessage.includes('wait') ||
				errorMessage.includes('ready')

			if (isTimeoutError) {
				log(
					'🕒 This appears to be a wait strategy timeout - container may have started but not ready'
				)
			}

			// Try to capture logs even if startup/wait failed
			const containerToCapture = this.container || tempContainer
			if (containerToCapture && process.env.DEBUG?.includes('camunda')) {
				const logPrefix = isTimeoutError
					? 'camunda-timeout'
					: 'camunda-startup-failed'
				log('📋 Attempting to capture logs from container...')
				try {
					await this.captureFailedContainerLogs(containerToCapture, logPrefix)
					log('✅ Successfully captured logs from failed container')

					// If we captured from tempContainer but not this.container, assign it
					if (!this.container && tempContainer) {
						this.container = tempContainer
						log('🔧 Assigned temp container to main container for cleanup')
					}
				} catch (logError) {
					log('❌ Failed to capture logs: %s', logError)
				}
			} else {
				log('⚠️ No container available for log capture')
			}

			throw error
		}
	}

	private async startConnectors(): Promise<void> {
		if (!this.container) {
			throw new Error('Zeebe container must be started before connectors')
		}

		const camundaGatewayPort = this.container.getMappedPort(26500)
		const image = `${this.config.connectorsDockerImageName}:${this.config.connectorsDockerImageVersion}`

		log('🔌 Starting Connectors container...')
		log('📥 Pulling image: %s', image)
		log('🔗 Connecting to Camunda gateway on port %d', camundaGatewayPort)

		const environment = {
			'ZEEBE_CLIENT_BROKER_GATEWAY-ADDRESS': `host.docker.internal:${camundaGatewayPort}`,
			ZEEBE_CLIENT_SECURITY_PLAINTEXT: 'true',
			...this.config.connectorsEnvVars,
			...this.config.connectorsSecrets,
		}

		log('🌍 Connectors environment variables: %O', environment)

		log('🏃 Starting Connectors container...')
		this.connectorsContainer = await new GenericContainer(image)
			.withEnvironment(environment)
			.withExposedPorts(8080)
			.withWaitStrategy(Wait.forLogMessage('Connectors started successfully'))
			.start()

		const port = this.connectorsContainer.getMappedPort(8080)
		debugContainer('✅ Connectors started successfully on port %d', port)
		debugContainer('📍 Connectors URL: http://localhost:%d', port)
		debugContainer('📍 Container ID: %s', this.connectorsContainer.getId())
	}

	private ensureLogsDirectory(): void {
		const logsDir = path.join(process.cwd(), 'camunda-test-logs')
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true })
			debugLogs('📁 Created logs directory: %s', logsDir)
		}
	}

	private async captureLogs(): Promise<void> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const logsDir = path.join(process.cwd(), 'camunda-test-logs')

		log('📋 Capturing container logs...')

		try {
			// Capture Camunda logs
			if (this.container) {
				const camundaLogFile = path.join(logsDir, `camunda-${timestamp}.log`)
				await this.saveContainerLogs(this.container, camundaLogFile, 'Camunda')
			} else {
				log('⚠️ Camunda container not available for log capture')
			}

			// Capture Connectors logs
			if (this.connectorsContainer) {
				const connectorsLogFile = path.join(
					logsDir,
					`connectors-${timestamp}.log`
				)
				await this.saveContainerLogs(
					this.connectorsContainer,
					connectorsLogFile,
					'Connectors'
				)
			} else {
				log('⚠️ Connectors container not available for log capture')
			}

			log('✅ Container log capture completed')
			log('📂 Logs directory: %s', logsDir)
		} catch (error) {
			log('❌ Error capturing logs: %s', error)
		}
	}

	private async saveContainerLogs(
		container: StartedTestContainer,
		filePath: string,
		containerName: string
	): Promise<void> {
		try {
			const logsStream = await container.logs()
			const writeStream = fs.createWriteStream(filePath)

			return new Promise((resolve) => {
				// Set a timeout to prevent hanging - container logs can be continuous
				const timeout = setTimeout(() => {
					debugLogs(
						'⏰ %s log capture timeout, closing stream...',
						containerName
					)
					writeStream.end()
					resolve()
				}, 5000) // 5 second timeout for regular log capture

				logsStream.pipe(writeStream)

				writeStream.on('finish', () => {
					clearTimeout(timeout)
					debugLogs('📄 %s logs saved to: %s', containerName, filePath)
					resolve()
				})

				writeStream.on('error', (error) => {
					clearTimeout(timeout)
					debugLogs('❌ Error saving %s logs: %s', containerName, error)
					resolve() // Don't reject, just log the error and continue
				})

				logsStream.on('error', (error) => {
					clearTimeout(timeout)
					debugLogs('❌ Error reading %s logs: %s', containerName, error)
					writeStream.end()
					resolve() // Don't reject, just log the error and continue
				})
			})
		} catch (error) {
			debugLogs('❌ Error getting %s logs: %s', containerName, error)
		}
	}

	private async captureInitialCamundaLogs(): Promise<void> {
		if (!this.container) return

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const logsDir = path.join(process.cwd(), 'camunda-test-logs')
		const initialLogFile = path.join(
			logsDir,
			`camunda-startup-${timestamp}.log`
		)

		debugLogs('📋 Capturing initial Camunda logs...')
		await this.saveContainerLogs(
			this.container,
			initialLogFile,
			'Camunda (startup)'
		)
	}

	private async captureFailedContainerLogs(
		container: StartedTestContainer,
		prefix: string
	): Promise<void> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const logsDir = path.join(process.cwd(), 'camunda-test-logs')
		const failedLogFile = path.join(logsDir, `${prefix}-${timestamp}.log`)

		debugLogs('📋 Capturing failed container logs...')
		try {
			// Try to get logs with a shorter timeout to avoid hanging
			const logsStream = await container.logs()
			const writeStream = fs.createWriteStream(failedLogFile)

			return new Promise((resolve) => {
				const timeout = setTimeout(() => {
					debugLogs('⏰ Log capture timeout, closing stream...')
					writeStream.end()
					resolve()
				}, 10000) // 10 second timeout

				logsStream.pipe(writeStream)

				writeStream.on('finish', () => {
					clearTimeout(timeout)
					debugLogs('📄 %s logs saved to: %s', prefix, failedLogFile)
					resolve()
				})

				writeStream.on('error', (error) => {
					clearTimeout(timeout)
					debugLogs('❌ Error saving %s logs: %s', prefix, error)
					resolve() // Don't reject, just log the error
				})

				logsStream.on('error', (error) => {
					clearTimeout(timeout)
					debugLogs('❌ Error reading container logs: %s', error)
					writeStream.end()
					resolve() // Don't reject, just log the error
				})
			})
		} catch (error) {
			debugLogs('❌ Could not capture failed container logs: %s', error)
		}
	}
}
