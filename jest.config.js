module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/source/test-setup.ts'],
  testTimeout: 120000, // 2 minutes for container startup
  detectOpenHandles: true, // Help with cleanup
  forceExit: true, // Ensure tests exit cleanly
  maxWorkers: 1, // Run tests sequentially to avoid container conflicts
};
