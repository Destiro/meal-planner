const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Plain JavaScript files (build scripts and their tests) run in Node or Jest, which provide these globals.
const nodeGlobals = {
  __dirname: 'readonly',
  require: 'readonly',
  module: 'writable',
  process: 'readonly',
  console: 'readonly',
};
const jestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
};

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'worker/*'] },
  { files: ['scripts/**/*.js'], languageOptions: { sourceType: 'commonjs', globals: nodeGlobals } },
  { files: ['src/**/*.test.js'], languageOptions: { sourceType: 'commonjs', globals: { ...nodeGlobals, ...jestGlobals } } },
]);
