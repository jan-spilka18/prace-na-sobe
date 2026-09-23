"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pushClient";

/**
 * Zaregistruje service worker.
 *
 * Nic nevykresluje. Musí běžet na každé obrazovce za přihlášením, protože
 * bez zaregistrovaného workeru nejde notifikace ani zapnout, ani doručit.
 */
export function ServiceWorker() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
