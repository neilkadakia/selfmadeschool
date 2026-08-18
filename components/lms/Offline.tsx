"use client";

// Registers the service worker and says, quietly, when the connection has
// gone. Everything it does is progressive: with no service worker support the
// classroom behaves exactly as it did before.

import { useEffect, useSyncExternalStore } from "react";

// The browser's connection state is an external store, so it is read as one
// rather than mirrored into React state from inside an effect.
function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const isOffline = () => !navigator.onLine;
// Rendered on the server, where there is no connection to have an opinion on.
const neverOnServer = () => false;

export default function Offline() {
  const offline = useSyncExternalStore(subscribe, isOffline, neverOnServer);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // After load, so registering never competes with the first paint.
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // No worker is a fine outcome: the site works, it just is not offline.
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  if (!offline) return null;

  return (
    <div className="lms-offline-bar" role="status">
      Offline. Saved units still open, and anything you do syncs when you are back.
    </div>
  );
}
