import { envConfig } from '../config';
import { logger } from './logger.utils';

/**
 * Key patterns that identify sensitive configuration values.
 *
 * Keys matching any of these patterns (case-insensitive) will be redacted
 * when logged via {@link maskSensitiveConfig}. When adding new config fields
 * that contain secrets, ensure the key follows one of these patterns so it
 * is automatically masked in the startup summary log.
 *
 * Sensitive patterns:
 * - `/secret/i`  — fields containing "secret" (e.g. `APP_SECRET`, `GOOGLE_CLIENT_SECRET`)
 * - `/password/i` — fields containing "password" (e.g. `GMAIL_APP_PASSWORD`)
 * - `/token/i`    — fields containing "token" (e.g. API tokens)
 * - `/credential/i` — fields containing "credential"
 * - `/^database_url$/i` — exact match for database connection URL
 * - `/_api_key$/i` — keys ending with `_API_KEY` (e.g. `CLOUDINARY_API_KEY`)
 *
 * @example
 * ```ts
 * maskSensitiveConfig({ APP_SECRET: 's3cret', PORT: 3000 })
 * // → { APP_SECRET: '***REDACTED***', PORT: 3000 }
 * ```
 */
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /^database_url$/i,
  /_api_key$/i,
];

/**
 * Masks sensitive configuration values for safe logging.
 *
 * Accepts a config record and returns a new object where values whose keys
 * match a sensitive pattern are replaced with a redaction placeholder.
 * Non-sensitive values are passed through as-is.
 *
 * @param config - The configuration object to mask
 * @returns A new object with sensitive values redacted
 */
export function maskSensitiveConfig<T extends Record<string, unknown>>(
  config: T
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
        ? '***REDACTED***'
        : value,
    ])
  );
}

export function checkOptionalDependencies(): void {
   const disabledFeatures: Array<{ dependency: string; impact: string }> = [];

   // Gmail credentials are technically optional (no min length enforced)
   if (!envConfig.GMAIL_USER || !envConfig.GMAIL_APP_PASSWORD) {
      disabledFeatures.push({
         dependency: 'Email Transport (Gmail)',
         impact:
            'Transactional emails will not be sent. Email-based flows (e.g., test emails) will fail.',
      });
   }

   // Paystack Public Key is explicitly optional in the schema
   if (!envConfig.PAYSTACK_PUBLIC_KEY) {
      disabledFeatures.push({
         dependency: 'Paystack Public Key',
         impact:
            'Client-side payment initializations requiring the public key may be impaired.',
      });
   }

   // Emit a single structured warning using Pino if there are any disabled features
   if (disabledFeatures.length > 0) {
      logger.warn(
         { disabledDependencies: disabledFeatures },
         'Server starting with optional dependencies disabled. Some features will have limited functionality.'
      );
   }
}
