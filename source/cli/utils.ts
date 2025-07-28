import * as path from 'path'

import * as fs from 'fs-extra'

export interface ProjectInfo {
	hasTypescript: boolean
	hasJest: boolean
	projectRoot: string
	packageJson?: Record<string, unknown>
}

export interface ExistingFiles {
	camundaConfig: boolean
	jestConfig: boolean
}

/**
 * Detect project setup by analyzing package.json
 */
export async function detectProjectSetup(): Promise<ProjectInfo> {
	const projectRoot = await findProjectRoot()
	const packageJsonPath = path.join(projectRoot, 'package.json')

	let packageJson: Record<string, unknown> = {}
	let hasTypescript = false
	let hasJest = false

	try {
		packageJson = await fs.readJson(packageJsonPath)

		// Check for TypeScript dependencies
		const allDeps = {
			...(packageJson.dependencies as Record<string, string>),
			...(packageJson.devDependencies as Record<string, string>),
		}

		hasTypescript = Object.keys(allDeps).some((dep) =>
			['typescript', '@types/node', '@types/jest', 'ts-jest'].includes(dep)
		)

		// Check for Jest dependencies
		hasJest = Object.keys(allDeps).some((dep) =>
			['jest', '@types/jest', 'ts-jest'].includes(dep)
		)
	} catch (error) {
		// If no package.json found, assume we're in a new project
	}

	return {
		hasTypescript,
		hasJest,
		projectRoot,
		packageJson,
	}
}

/**
 * Find the project root by looking for package.json
 */
async function findProjectRoot(): Promise<string> {
	let currentDir = process.cwd()

	while (currentDir !== path.dirname(currentDir)) {
		const packageJsonPath = path.join(currentDir, 'package.json')
		if (await fs.pathExists(packageJsonPath)) {
			return currentDir
		}
		currentDir = path.dirname(currentDir)
	}

	// If no package.json found, use current directory
	return process.cwd()
}

/**
 * Check for existing configuration files
 */
export async function checkExistingFiles(
	projectRoot: string
): Promise<ExistingFiles> {
	const camundaConfigPath = path.join(projectRoot, 'camunda-test-config.json')
	const jestConfigPath = path.join(projectRoot, 'jest.config.js')

	return {
		camundaConfig: await fs.pathExists(camundaConfigPath),
		jestConfig: await fs.pathExists(jestConfigPath),
	}
}

/**
 * Write a file safely with proper formatting
 */
export async function writeConfigFile(
	filePath: string,
	content: string
): Promise<void> {
	await fs.writeFile(filePath, content, 'utf8')
}

/**
 * Write JSON configuration file with proper formatting
 */
export async function writeJsonFile(
	filePath: string,
	content: object
): Promise<void> {
	const jsonContent = JSON.stringify(content, null, 4)
	await fs.writeFile(filePath, jsonContent + '\n', 'utf8')
}
