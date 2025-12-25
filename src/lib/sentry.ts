import * as Sentry from "@sentry/react";

export const initSentry = () => {
  // Only initialize Sentry in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,

      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
      // Adjust this in production
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

      // Capture Replay for 10% of all sessions,
      // plus 100% of sessions with an error
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Filter out unnecessary errors
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Ignore network errors from Supabase (handled by app)
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);
          if (
            message.includes('Failed to fetch') ||
            message.includes('NetworkError') ||
            message.includes('timeout')
          ) {
            return null;
          }
        }

        return event;
      },
    });

    // Set user context when available
    const setUserContext = (user: { id: string; email?: string; full_name?: string }) => {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.full_name,
      });
    };

    return { setUserContext };
  }

  // Return no-op functions in development
  return {
    setUserContext: () => {},
  };
};

export { Sentry };
