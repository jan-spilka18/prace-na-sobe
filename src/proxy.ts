import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
      Všechno kromě statických souborů a ikon. Service worker a manifest
      musí zůstat venku, jinak by je proxy přesměrovala na přihlášení
      a instalace PWA by se rozbila.

      Stejně tak naplánované úlohy: ty se prokazují tajemstvím v hlavičce,
      ne přihlášením. Bez téhle výjimky by je proxy poslala na /prihlaseni
      a žádná připomínka by nikdy neodešla.
    */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
