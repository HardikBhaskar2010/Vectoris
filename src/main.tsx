// Synchronous theme initialization before React hydration
try {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get("theme") || window.localStorage.getItem("vectoris.themePreference");
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  }
} catch {
  // Non-blocking in restricted environments
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/global.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
