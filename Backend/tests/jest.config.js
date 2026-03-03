module.exports = {
  rootDir: '..',
  preset: '@shelf/jest-mongodb',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**',
    '!tests/**',
    '!scripts/**'
  ],
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/helpers/envSetup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/testSetup.js'],
  testTimeout: 30000,
};
