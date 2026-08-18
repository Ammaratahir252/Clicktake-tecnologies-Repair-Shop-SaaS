"use client";

import { useEffect } from "react";

/** Registers the service worker (public/sw.js) client-side once the app has
 * mounted — required for install-to-home-screen and the offline fallback. */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — the app still works fully online without a service worker.
      });
    }
  }, []);

  return null;
}
