import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Stránky dostupné bez přihlášení. */
const PUBLIC_PATHS = ["/prihlaseni"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  /*
    getUser() se ptá Supabase po síti — stejně jako stránky za proxy.
    Musí to být stejná otázka: getClaims() věřil podepsanému tokenu
    z cookie, který po odhlášení na jiném zařízení ještě hodinu platí,
    zatímco Supabase už přihlášení zrušila. Proxy pak klienta pustila dál,
    stránka ho poslala na přihlášení, proxy zpátky — a Safari skončilo
    hláškou „too many redirects". getSession() by jen četl cookie, které
    se dá podvrhnout.
  */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/prihlaseni";
    url.searchParams.set("dal", pathname);
    return NextResponse.redirect(url);
  }

  // Přihlášeného z přihlašovací stránky přesměrovává až stránka sama,
  // podle stejné kontroly jako zbytek aplikace (getProfile). Kdyby to
  // dělala proxy, stačí jediný rozdíl mezi oběma kontrolami a vznikne
  // smyčka: stránka posílá na přihlášení, proxy z něj pryč.

  return response;
}
