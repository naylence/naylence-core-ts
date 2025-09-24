import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        // Jest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        beforeAll: "readonly",
        afterEach: "readonly",
        afterAll: "readonly",
        jest: "readonly",
        fail: "readonly",
        // Node.js globals
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        // Browser globals
        btoa: "readonly",
        atob: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Turn off problematic rules for testing codebase
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',  // TypeScript handles this
      // Keep style rules
      'quotes': ['error', 'double', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
    },
  },
];