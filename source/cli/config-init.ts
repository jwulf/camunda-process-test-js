import * as path from 'path'

import {
	CAMUNDA_CONFIG_TEMPLATE,
	JEST_CONFIG_JAVASCRIPT_TEMPLATE,
	JEST_CONFIG_TYPESCRIPT_TEMPLATE,
} from './templates'
import {
	checkExistingFiles,
	detectProjectSetup,
	writeConfigFile,
	writeJsonFile,
	type ProjectInfo,
} from './utils'

interface ConfigInitOptions {
	dryRun?: boolean
	jest?: boolean
}

export async function configInit(options: ConfigInitOptions): Promise<void> {
	console.log('🚀 Initializing Camunda process test configuration...')

	try {
		// Detect project setup
		const projectInfo = await detectProjectSetup()
		const existingFiles = await checkExistingFiles(projectInfo.projectRoot)

		console.log(`📁 Project root: ${projectInfo.projectRoot}`)
		console.log(`🔧 TypeScript detected: ${projectInfo.hasTypescript}`)
		console.log(`🧪 Jest detected: ${projectInfo.hasJest}`)

		// Check for conflicts
		if (existingFiles.camundaConfig) {
			console.error(
				'❌ camunda-test-config.json already exists, not overwriting'
			)
			process.exit(1)
		}

		// Determine if we should generate Jest config
		const shouldGenerateJest = options.jest || projectInfo.hasJest

		if (options.jest && existingFiles.jestConfig) {
			console.error('❌ jest.config.js already exists, not overwriting')
			process.exit(1)
		}

		// Generate configurations
		await generateConfigurations(projectInfo, options, shouldGenerateJest)

		// Check for missing dependencies
		await checkDependencies(projectInfo, shouldGenerateJest)

		console.log('✅ Configuration initialization complete!')
	} catch (error) {
		console.error('❌ Error initializing configuration:', error)
		process.exit(1)
	}
}

async function generateConfigurations(
	projectInfo: ProjectInfo,
	options: ConfigInitOptions,
	shouldGenerateJest: boolean
): Promise<void> {
	const { projectRoot, hasTypescript } = projectInfo

	// Generate camunda-test-config.json
	const camundaConfigPath = path.join(projectRoot, 'camunda-test-config.json')

	if (options.dryRun) {
		console.log('\n📄 Would create camunda-test-config.json:')
		console.log(JSON.stringify(CAMUNDA_CONFIG_TEMPLATE, null, 4))
	} else {
		await writeJsonFile(camundaConfigPath, CAMUNDA_CONFIG_TEMPLATE)
		console.log('✅ Created camunda-test-config.json')
	}

	// Generate Jest configuration if needed
	if (shouldGenerateJest) {
		const jestConfigPath = path.join(projectRoot, 'jest.config.js')
		const jestTemplate = hasTypescript
			? JEST_CONFIG_TYPESCRIPT_TEMPLATE
			: JEST_CONFIG_JAVASCRIPT_TEMPLATE

		if (options.dryRun) {
			console.log('\n📄 Would create jest.config.js:')
			console.log(jestTemplate)
		} else if (
			!(await checkExistingFiles(projectRoot).then((f) => f.jestConfig))
		) {
			await writeConfigFile(jestConfigPath, jestTemplate)
			console.log('✅ Created jest.config.js')
		}
	} else if (projectInfo.hasJest && !options.jest) {
		// Jest was inferred but --jest not specified, show suggestion
		console.log('\n💡 Jest detected but jest.config.js not updated.')
		console.log('   Suggested Jest configuration:')
		const jestTemplate = hasTypescript
			? JEST_CONFIG_TYPESCRIPT_TEMPLATE
			: JEST_CONFIG_JAVASCRIPT_TEMPLATE
		console.log(jestTemplate)
	}
}

async function checkDependencies(
	projectInfo: ProjectInfo,
	shouldGenerateJest: boolean
): Promise<void> {
	if (!shouldGenerateJest || !projectInfo.hasTypescript) {
		return
	}

	// Check for ts-jest when generating TypeScript Jest config
	const packageJson = projectInfo.packageJson || {}
	const allDeps = {
		...((packageJson.dependencies as Record<string, string>) || {}),
		...((packageJson.devDependencies as Record<string, string>) || {}),
	}

	if (!allDeps['ts-jest']) {
		console.log('\n💡 TypeScript Jest configuration requires ts-jest.')
		console.log('   Run: npm i -D ts-jest')
	}
}
