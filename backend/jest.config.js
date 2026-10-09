/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  // `uuid` ships ESM-only; map it to a CJS stub for tests.
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/helpers/uuidMock.js',
  },
  setupFiles: ['<rootDir>/test/helpers/env.setup.js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', esModuleInterop: true, skipLibCheck: true, resolveJsonModule: true, types: ['node', 'jest'] } }],
  },
  collectCoverageFrom: [
    'src/services/auth.service.ts',
    'src/services/sale.service.ts',
    'src/services/sync.service.ts',
    'src/services/subscription.service.ts',
    'src/services/employee.service.ts',
    'src/middlewares/permission.middleware.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
