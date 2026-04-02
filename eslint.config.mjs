import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.vite/**'] },
  js.configs.recommended,
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11yPlugin.configs.recommended.rules,
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['server/src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/setupTests.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
];
