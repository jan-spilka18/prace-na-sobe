"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/url";

/*
  Soukromý prostor Honzy: přípravy na sezení, poznámky ke klientovi a odkazy.

  Klient se k ničemu z toho nedostane — politiky v databázi tyhle tři tabulky
  vydají jen adminovi. Každá funkce tady přesto začíná requireAdmin(): kdyby
  někdy někdo politiku uvolnil, nemá to projít ani o patro výš.
*/

export type PrivateResult = { error?: string; id?: string };

/**
 * Příprava na sezení. Na sezení připadá jedna.
 *
 * Tabulka nemá na session_id unikátní index, takže se nedá upsertovat —
 * řádek se nejdřív hledá a pak zakládá nebo přepisuje. U jednoho admina
 * na jednom zařízení to stačí; unikátní index by znamenal migraci, kvůli
 * které by se musel ručně pouštět SQL editor.
 */
export async function savePrep(input: {
  sessionId: string;
  content: string;
}): Promise<PrivateResult> {
  await requireAdmin();

  const supabase = await createClient();
  const content = input.content.trim();

  const { data: existing } = await supabase
    .from("session_preps")
    .select("id")
    .eq("session_id", input.sessionId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("session_preps")
      .update({ content })
      .eq("id", existing.id);

    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    return { id: existing.id };
  }

  const { data, error } = await supabase
    .from("session_preps")
    .insert({ session_id: input.sessionId, content })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Přípravu se nepodařilo uložit." };
  }

  revalidatePath("/", "layout");
  return { id: data.id };
}

export async function createNote(input: {
  clientId: string;
  body: string;
}): Promise<PrivateResult> {
  await requireAdmin();

  const body = input.body.trim();
  if (body === "") return { error: "Prázdnou poznámku nemá smysl ukládat." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .insert({ client_id: input.clientId, body })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Poznámku se nepodařilo uložit." };
  }

  revalidatePath("/", "layout");
  return { id: data.id };
}

export async function updateNote(input: {
  noteId: string;
  body: string;
}): Promise<PrivateResult> {
  await requireAdmin();

  const body = input.body.trim();
  if (body === "") return { error: "Prázdnou poznámku nemá smysl ukládat." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_notes")
    .update({ body })
    .eq("id", input.noteId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function deleteNote(noteId: string): Promise<PrivateResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function createLink(input: {
  clientId: string;
  title: string;
  url: string;
}): Promise<PrivateResult> {
  await requireAdmin();

  const title = input.title.trim();
  const url = safeUrl(input.url);

  if (title === "") return { error: "Odkaz potřebuje název." };
  if (!url) return { error: "Adresa musí začínat http:// nebo https://." };

  const supabase = await createClient();

  // Nový odkaz patří na konec. Pořadí drží sloupec position, protože
  // podle času vytvoření by se nedalo přeskládat.
  const { data: last } = await supabase
    .from("client_links")
    .select("position")
    .eq("client_id", input.clientId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("client_links")
    .insert({
      client_id: input.clientId,
      title,
      url,
      position: (last?.position ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Odkaz se nepodařilo uložit." };
  }

  revalidatePath("/", "layout");
  return { id: data.id };
}

export async function deleteLink(linkId: string): Promise<PrivateResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("client_links").delete().eq("id", linkId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}
