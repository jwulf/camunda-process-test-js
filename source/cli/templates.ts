/**
 * Configuration file templates for scaffolding new projects.
 */

export const CAMUNDA_CONFIG_TEMPLATE = {
	camundaDockerImageVersion: '8.8.0-alpha6',
}

export const JEST_CONFIG_TYPESCRIPT_TEMPLATE = `const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testTimeout: process.env.CI ? 300000 : 30000, 
  maxWorkers: 1, // Always sequential for Docker tests
};
`

export const JEST_CONFIG_JAVASCRIPT_TEMPLATE = `module.exports = {
  testEnvironment: "node",
  testTimeout: process.env.CI ? 300000 : 30000, 
  maxWorkers: 1, // Always sequential for Docker tests
};
`
