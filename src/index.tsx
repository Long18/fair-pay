import React from "react";
import { createRoot } from "react-dom/client";

import "./i18n";
import { initSentry } from "./lib/sentry";
import { analytics } from "./lib/analytics";
import { measureWebVitals } from "./lib/performance";
import App from "./App";

// Initialize Sentry (only in production with DSN configured)
initSentry();

// Initialize Analytics (only if provider configured)
analytics.init();

// Measure Web Vitals for performance monitoring (production only)
if (import.meta.env.PROD) {
  measureWebVitals((metric) => {
    // Send performance metrics to analytics
    analytics.track({
      action: metric.name,
      category: 'web-vitals',
      label: metric.rating,
      value: Math.round(metric.value),
      properties: {
        ...metric,
        // Add additional context
        connection: (navigator as any).connection?.effectiveType || 'unknown',
        deviceMemory: (navigator as any).deviceMemory || 'unknown',
      },
    });
  });
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
