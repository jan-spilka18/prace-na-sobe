"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type VisionState = { error?: string; saved?: boolean };

export async function saveVision(input: {
  programId: string;
  body: string;
}): Promise<VisionState> {
  await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("visions").upsert(
    { program_id: input.programId, body: input.body.trim() },
    { onConflict: "program_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { saved: true };
}
