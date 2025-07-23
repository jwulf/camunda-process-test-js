module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/source/test-setup.ts'],
  detectOpenHandles: true, // Help with cleanup
  forceExit: true, // Ensure tests exit cleanly
  maxWorkers: process.env.CI ? 1 : 1, // Sequential execution
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/examples/**/*.test.ts'],
  roots: ['<rootDir>/test', '<rootDir>/examples'],
  // Separate projects for different test types
  projects: [
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'unit',
      testMatch: ['<rootDir>/test/**/*.test.ts'],
      maxWorkers: process.env.CI ? 2 : '50%',
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'integration',
      testMatch: ['<rootDir>/examples/**/*.test.ts'],
      maxWorkers: 1, // Always sequential for Docker tests
      setupFilesAfterEnv: ['<rootDir>/source/test-setup.ts'],
    },
  ],
  // Global timeout - will be overridden per test as needed
  testTimeout: process.env.CI ? 300000 : 30000,
}
