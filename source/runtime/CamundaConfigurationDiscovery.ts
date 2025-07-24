import fs from 'fs'
import path from 'path'

import Debug from 'debug'

import type { CamundaRuntimeConfiguration } from '../types'

const debug = Debug('camunda:test:config')

/**
 * Discovers and loads Camunda test configuration files.
 * Supports:
 * 1. Environment variable override (CAMUNDA_TEST_CONFIG_FILE)
 * 2. Project root configuration file (camunda-test-config.json)
 */
export class CamundaConfigurationDiscovery {
	private static readonly CONFIG_FILE_NAME = 'camunda-test-config.json'
	private static readonly CONFIG_FILE_ENV_VAR = 'CAMUNDA_TEST_CONFIG_FILE'

	/**
	 * Resolves the final configuration using either environment variable override
	 * or project root discovery.
	 */
	public static resolveConfiguration(): Partial<CamundaRuntimeConfiguration> {
		// Check for environment variable override first
		const configFileOverride = process.env[this.CONFIG_FILE_ENV_VAR]

		if (configFileOverride) {
			debug(`🎯 Config file override detected: ${configFileOverride}`)
			return this.loadSpecificConfigFile(configFileOverride)
		}

		// Fall back to project root discovery
		debug('📁 Using project root config discovery')
		const projectRoot = this.getProjectRoot()
		const configPath = path.join(projectRoot, this.CONFIG_FILE_NAME)

		if (fs.existsSync(configPath)) {
			try {
				const configContent = fs.readFileSync(configPath, 'utf-8')
				const config = JSON.parse(configContent)
				debug(`📄 Loaded project root config: ${configPath}`)
				debug(`⚙️  Configuration content:`, config)
				return config
			} catch (error) {
				debug(
					`⚠️  Invalid config file: ${configPath} - ${error instanceof Error ? error.message : String(error)}`
				)
			}
		} else {
			debug(`📭 No config file found at project root: ${configPath}`)
		}

		return {}
	}

	/**
	 * Loads a specific configuration file specified by environment variable.
	 * Fails fast if the file doesn't exist or can't be parsed.
	 */
	private static loadSpecificConfigFile(
		filePath: string
	): Partial<CamundaRuntimeConfiguration> {
		const resolvedPath = this.resolveConfigFilePath(filePath)

		if (!fs.existsSync(resolvedPath)) {
			const availableConfigs = this.findAvailableConfigFiles()
			throw new Error(
				`Camunda test configuration file not found: ${resolvedPath}\n` +
					`Specified via environment variable ${this.CONFIG_FILE_ENV_VAR}=${filePath}\n` +
					`Please check that the file exists and the path is correct.\n\n` +
					`Available configuration files:\n${availableConfigs
						.map((file) => `  - ${file}`)
						.join('\n')}`
			)
		}

		try {
			const configContent = fs.readFileSync(resolvedPath, 'utf-8')
			const config = JSON.parse(configContent)

			debug(`📄 Loaded specific config file: ${resolvedPath}`)
			debug(`⚙️  Configuration content:`, config)

			return config
		} catch (error) {
			throw new Error(
				`Failed to parse Camunda test configuration file: ${resolvedPath}\n` +
					`Error: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	/**
	 * Resolves a configuration file path, handling both relative and absolute paths.
	 */
	private static resolveConfigFilePath(filePath: string): string {
		// If absolute path, use as-is
		if (path.isAbsolute(filePath)) {
			return filePath
		}

		// If relative path, resolve from project root
		const projectRoot = this.getProjectRoot()
		return path.resolve(projectRoot, filePath)
	}

	/**
	 * Finds the project root by looking for package.json.
	 */
	private static getProjectRoot(): string {
		let currentDir = process.cwd()

		while (currentDir !== path.parse(currentDir).root) {
			if (fs.existsSync(path.join(currentDir, 'package.json'))) {
				return currentDir
			}
			currentDir = path.dirname(currentDir)
		}

		throw new Error(
			'Project root not found - no package.json found in directory tree'
		)
	}

	/**
	 * Finds available configuration files for error reporting.
	 */
	private static findAvailableConfigFiles(): string[] {
		const files: string[] = []
		const projectRoot = this.getProjectRoot()

		// Check project root
		const projectRootConfig = path.join(projectRoot, this.CONFIG_FILE_NAME)
		if (fs.existsSync(projectRootConfig)) {
			files.push(
				path.relative(projectRoot, projectRootConfig) || this.CONFIG_FILE_NAME
			)
		}

		// Check for configs directory
		const configsDir = path.join(projectRoot, 'configs')
		if (fs.existsSync(configsDir)) {
			try {
				const configFiles = fs
					.readdirSync(configsDir)
					.filter((file) => file.endsWith('.json'))
					.map((file) => `configs/${file}`)
				files.push(...configFiles)
			} catch {
				// Ignore errors reading configs directory
			}
		}

		return files.length > 0 ? files : ['(no configuration files found)']
	}
}
