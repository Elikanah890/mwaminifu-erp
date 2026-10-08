// Deterministic test environment (applied before any module is imported).
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long_000';
process.env.MOCK_SMS = 'true';
process.env.MOCK_FCM = 'true';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
