import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for error tracking and monitoring
 *
 * NOTE: Set VITE_SENTRY_DSN in environment variables to enable Sentry
 * For development, you can leave it empty to disable error reporting
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.info('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always capture replays on error

    // Environment
    environment: import.meta.env.MODE,

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Filter out common expected errors
    beforeSend(event) {
      // Don't send errors in development
      if (import.meta.env.DEV) {
        console.error('Sentry would have sent:', event);
        return null;
      }

      // Filter out network errors (handled by React Query)
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }

      return event;
    },
  });
}
