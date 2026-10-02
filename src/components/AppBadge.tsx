"use client";

import { useEffect } from "react";

/**
 * Číslo na ikoně aplikace na ploše telefonu.
 *
 * Funguje u aplikace přidané na plochu: na Androidu hned, na iPhonu jen když
 * má aplikace povolená oznámení. Kde to telefon neumí, nestane se nic.
 */
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;

    const update = count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge();
    update.catch(() => {
      // Bez povolení odznak neprojde. Není to chyba, kterou by šlo řešit tady.
    });
  }, [count]);

  return null;
}
