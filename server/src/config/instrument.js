import Sentry from '@sentry/node';

// Sentry is only initialized when SENTRY_DSN is provided.
// If the variable is absent (local dev, CI, forks), telemetry is silently skipped.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // sendDefaultPii defaults to false — we do not collect IP addresses or
    // other PII unless you explicitly set SENTRY_SEND_PII=true.
    sendDefaultPii: process.env.SENTRY_SEND_PII === 'true',
  });
}
