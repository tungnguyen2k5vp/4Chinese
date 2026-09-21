const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'data/raw/**'],
    rules: {
      'import/order': ['warn', { alphabetize: { order: 'asc' }, 'newlines-between': 'always' }],
    },
  },
]);
