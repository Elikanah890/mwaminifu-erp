const ORIGINAL_ENV = { ...process.env };

function loadEnvWith(overrides: Record<string, string>) {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, ...overrides };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/config/env') as typeof import('../src/config/env');
}

describe('validateProductionConfig', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  it('throws when MOCK_SMS is enabled in production', () => {
    const { validateProductionConfig } = loadEnvWith({
      NODE_ENV: 'production',
      MOCK_SMS: 'true',
      MOCK_FCM: 'false',
      JWT_SECRET: 'x'.repeat(40),
    });
    expect(() => validateProductionConfig()).toThrow(/MOCK_SMS/);
  });

  it('throws when MOCK_FCM is enabled in production', () => {
    const { validateProductionConfig } = loadEnvWith({
      NODE_ENV: 'production',
      MOCK_SMS: 'false',
      MOCK_FCM: 'true',
      SMS_PROVIDER: 'beem',
      SMS_API_KEY: 'key',
      SMS_API_SECRET: 'secret',
      JWT_SECRET: 'x'.repeat(40),
    });
    expect(() => validateProductionConfig()).toThrow(/MOCK_FCM/);
  });

  it('does not throw in development', () => {
    const { validateProductionConfig } = loadEnvWith({
      NODE_ENV: 'development',
      MOCK_SMS: 'true',
      MOCK_FCM: 'true',
    });
    expect(() => validateProductionConfig()).not.toThrow();
  });

  it('does not throw in production when real gateways are configured', () => {
    const { validateProductionConfig } = loadEnvWith({
      NODE_ENV: 'production',
      MOCK_SMS: 'false',
      MOCK_FCM: 'false',
      SMS_PROVIDER: 'beem',
      SMS_API_KEY: 'key',
      SMS_API_SECRET: 'secret',
      FCM_SERVER_KEY: 'fcm-key',
      JWT_SECRET: 'x'.repeat(40),
    });
    expect(() => validateProductionConfig()).not.toThrow();
  });
});
