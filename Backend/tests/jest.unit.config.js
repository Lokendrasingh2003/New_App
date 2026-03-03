module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/helpers/envSetup.js'],
  collectCoverageFrom: [
    'utils/**/*.js',
    'validators/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!tests/**',
  ],
  testTimeout: 20000,
};
