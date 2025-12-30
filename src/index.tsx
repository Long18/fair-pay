import React from "react";
import { createRoot } from "react-dom/client";

import "./i18n";
import { initSentry } from "./lib/sentry";
import { analytics } from "./lib/analytics";
import { measureWebVitals, logPerformanceSummary } from "./lib/performance";
import App from "./App";

// Initialize Sentry (only in production with DSN configured)
initSentry();

// Initialize Analytics (only if provider configured)
analytics.init();

// Measure Web Vitals for performance monitoring
if (import.meta.env.PROD) {
  // In production, send metrics to analytics
  measureWebVitals((metric) => {
    // Send to analytics service
    analytics.track({
      action: metric.name,
      category: 'performance',
      label: metric.rating,
      value: Math.round(metric.value),
      properties: metric,
    });
  });
} else {
  // In development, log metrics to console
  measureWebVitals();

  // Log performance summary when page fully loads
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(logPerformanceSummary, 0);
    });
  }
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
