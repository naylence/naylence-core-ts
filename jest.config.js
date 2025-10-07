/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: [
    '<rootDir>/src',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^naylence-factory$': '<rootDir>/../naylence-factory-ts/dist/cjs/index.js',
    '^naylence-factory-ts$': '<rootDir>/../naylence-factory-ts/dist/cjs/index.js',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          isolatedModules: true,
          sourceMap: true,
          inlineSources: true,
          inlineSourceMap: false, // Use separate source maps for better debugging
        },
        diagnostics: {
          ignoreCodes: [151001],
        },
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '<rootDir>/../naylence-factory-ts/src/**/*.ts',
    '!src/**/*.test.ts',
    '!<rootDir>/../naylence-factory-ts/src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!<rootDir>/../naylence-factory-ts/src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
};
