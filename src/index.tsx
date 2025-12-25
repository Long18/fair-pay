import React from "react";
import { createRoot } from "react-dom/client";

import "./i18n";
import { initSentry } from "./lib/sentry";
import App from "./App";

// Initialize Sentry (only in production with DSN configured)
initSentry();

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
