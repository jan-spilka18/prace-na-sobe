import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component zapisovat cookies nesmí. Obnovu session tu
            // řeší middleware, takže se tenhle případ dá bezpečně přejít.
          }
        },
      },
    },
  );
}

/**
 * Klient se servisním klíčem — obchází Row Level Security.
 *
 * Používat výhradně tam, kde to jde jinak: zakládání účtů a naplánované úlohy.
 * Každé volání si musí samo ověřit, že ho spustil admin.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Chybí SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
