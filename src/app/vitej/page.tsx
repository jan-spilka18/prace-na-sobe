import { redirect } from "next/navigation";
import { requireProfile, usesAdminPassword } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { activeProgram, allHabits, visionFor } from "@/lib/queries";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Vítej" };

/**
 * Úvodní průvodce. Leží mimo skupinu (klient), takže nemá spodní lištu
 * a layout klienta sem nepřesměruje dokola.
 */
export default async function WelcomePage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/admin");
  // Kdo průvodce prošel nebo zavřel, sem nepatří. Přísně na true:
  // před spuštěním migrace je hodnota undefined a to znamená „ne".
  if (profile.onboarding_pending !== true) redirect("/");

  const supabase = await createClient();
  const [program, habits, needsPassword] = await Promise.all([
    activeProgram(supabase, profile.id),
    allHabits(supabase, profile.id),
    usesAdminPassword(),
  ]);
  const vision = program ? await visionFor(supabase, program.id) : "";

  return (
    <Onboarding
      profile={{
        fullName: profile.full_name,
        phone: profile.phone ?? "",
        birthDay: profile.birth_day ?? null,
        birthMonth: profile.birth_month ?? null,
      }}
      programId={program?.id ?? null}
      vision={vision}
      existingHabits={habits
        .filter((habit) => !habit.archived_at)
        .map((habit) => habit.title)}
      needsPassword={needsPassword}
    />
  );
}
