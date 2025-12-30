import React from "react";
import { createRoot } from "react-dom/client";

import "./i18n";
import { initSentry } from "./lib/sentry";
import { analytics } from "./lib/analytics";
import App from "./App";

// Initialize Sentry (only in production with DSN configured)
initSentry();

// Initialize Analytics (only if provider configured)
analytics.init();

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
