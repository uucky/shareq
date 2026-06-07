import js from '@eslint/js';

const nodeGlobals = {
  Buffer: 'readonly',
  clearInterval: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  process: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly'
};

export default [
  {
    ignores: [
      'data/**',
      'node_modules/**',
      'public/**'
    ]
  },
  js.configs.recommended,
  {
    files: [
      'server.js',
      'index.js',
      'check_ids.js',
      'src/**/*.js',
      'test/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always']
    }
  }
];
