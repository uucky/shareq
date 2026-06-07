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

const browserGlobals = {
  alert: 'readonly',
  Blob: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  document: 'readonly',
  FileReader: 'readonly',
  Image: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  window: 'readonly'
};

export default [
  {
    ignores: [
      'data/**',
      'node_modules/**'
    ]
  },
  js.configs.recommended,
  {
    files: [
      'server.js',
      'index.js',
      'scripts/**/*.js',
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
  },
  {
    files: [
      'public/app.js',
      'public/js/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      semi: ['error', 'always']
    }
  }
];
