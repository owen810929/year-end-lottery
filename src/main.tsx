import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/main.css";
import "./styles/import-panel.css";
import "./styles/print.css";
import "./styles/ui-polish.css";

function unregisterLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch(() => {});
  });
}

function clearLegacyCaches() {
  if (!("caches" in window)) return;

  window.addEventListener("load", () => {
    caches
      .keys()
      .then((keys) => {
        keys.filter((key) => key.startsWith("year-end-party")).forEach((key) => caches.delete(key));
      })
      .catch(() => {});
  });
}

unregisterLegacyServiceWorkers();
clearLegacyCaches();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
