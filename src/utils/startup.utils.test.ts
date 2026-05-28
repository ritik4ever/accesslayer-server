import { checkOptionalDependencies, maskSensitiveConfig } from './startup.utils';
import { logger } from './logger.utils';
import { envConfig } from '../config';

jest.mock('./logger.utils', () => ({
   logger: {
      warn: jest.fn(),
   },
}));

jest.mock('../config', () => ({
   envConfig: {
      GMAIL_USER: '',
      GMAIL_APP_PASSWORD: '',
      PAYSTACK_PUBLIC_KEY: undefined,
   },
}));

describe('Startup Utilities', () => {
   beforeEach(() => {
      jest.clearAllMocks();
   });

   it('should emit a structured warning with impact hints when optional dependencies are disabled', () => {
      checkOptionalDependencies();

      expect(logger.warn).toHaveBeenCalledWith(
         expect.objectContaining({
            disabledDependencies: expect.arrayContaining([
               expect.objectContaining({
                  dependency: 'Email Transport (Gmail)',
               }),
               expect.objectContaining({ dependency: 'Paystack Public Key' }),
            ]),
         }),
         'Server starting with optional dependencies disabled. Some features will have limited functionality.'
      );
   });

   it('should not emit a warning when all optional dependencies are present', () => {
      envConfig.GMAIL_USER = 'user@gmail.com';
      envConfig.GMAIL_APP_PASSWORD = 'secure-app-password';
      envConfig.PAYSTACK_PUBLIC_KEY = 'pk_test_123456789';

      checkOptionalDependencies();

      expect(logger.warn).not.toHaveBeenCalled();
   });
});

describe('maskSensitiveConfig', () => {
   it('redacts values whose keys contain "secret"', () => {
      const result = maskSensitiveConfig({
         APP_SECRET: 'super-secret',
         GOOGLE_CLIENT_SECRET: 'client-secret',
      });
      expect(result.APP_SECRET).toBe('***REDACTED***');
      expect(result.GOOGLE_CLIENT_SECRET).toBe('***REDACTED***');
   });

   it('redacts values whose keys contain "password"', () => {
      const result = maskSensitiveConfig({
         GMAIL_APP_PASSWORD: 'my-password',
      });
      expect(result.GMAIL_APP_PASSWORD).toBe('***REDACTED***');
   });

   it('redacts values whose keys contain "token"', () => {
      const result = maskSensitiveConfig({
         SOME_API_TOKEN: 'tok_abc123',
      });
      expect(result.SOME_API_TOKEN).toBe('***REDACTED***');
   });

   it('redacts DATABASE_URL', () => {
      const result = maskSensitiveConfig({
         DATABASE_URL: 'postgresql://user:pass@localhost/db',
      });
      expect(result.DATABASE_URL).toBe('***REDACTED***');
   });

   it('redacts keys ending with _API_KEY', () => {
      const result = maskSensitiveConfig({
         CLOUDINARY_API_KEY: 'cloudinary-key',
      });
      expect(result.CLOUDINARY_API_KEY).toBe('***REDACTED***');
   });

   it('does not redact PAYSTACK_PUBLIC_KEY', () => {
      const result = maskSensitiveConfig({
         PAYSTACK_PUBLIC_KEY: 'pk_test_public',
      });
      expect(result.PAYSTACK_PUBLIC_KEY).toBe('pk_test_public');
   });

   it('passes non-sensitive values through as-is', () => {
      const result = maskSensitiveConfig({
         PORT: 3000,
         MODE: 'development',
         FRONTEND_URL: 'http://localhost:5173',
      });
      expect(result.PORT).toBe(3000);
      expect(result.MODE).toBe('development');
      expect(result.FRONTEND_URL).toBe('http://localhost:5173');
   });

   it('returns an empty object when given an empty config', () => {
      const result = maskSensitiveConfig({});
      expect(result).toEqual({});
   });

   it('does not mutate the original config object', () => {
      const original = { PORT: 3000, APP_SECRET: 's3cret' };
      const originalPort = original.PORT;
      const originalSecret = original.APP_SECRET;
      maskSensitiveConfig(original);
      expect(original.PORT).toBe(originalPort);
      expect(original.APP_SECRET).toBe(originalSecret);
   });
});
