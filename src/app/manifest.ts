import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/config";

/**
 * Manifest PWA.
 *
 * Bez něj jde aplikace na iPhonu přidat na plochu, ale chová se jako záložka
 * v prohlížeči — a hlavně na ní nefungují push notifikace: iOS je pouští jen
 * z aplikace spuštěné z plochy v režimu standalone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    lang: "cs",
    start_url: "/",
    // standalone schová adresní řádek. Na iOS je to zároveň podmínka
    // pro web push.
    display: "standalone",
    orientation: "portrait",
    background_color: "#F2F2F7",
    theme_color: "#5FC3CE",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
