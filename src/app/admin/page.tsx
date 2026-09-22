import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ListGroup, ListRow } from "@/components/ui/List";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/components/SignOutButton";
import { clampedProgramDay, formatCzechDate, todayISO } from "@/lib/date";
import Link from "next/link";
import type { Program } from "@/lib/database.types";

export const metadata = { title: "Klienti" };

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: clients }, { data: programs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("full_name"),
    supabase.from("programs").select("*").eq("status", "active"),
  ]);

  const programByClient = new Map<string, Program>(
    (programs ?? []).map((p) => [p.client_id, p]),
  );
  const today = todayISO();

  return (
    <Screen
      title="Klienti"
      subtitle={`${clients?.length ?? 0} aktivních`}
      action={<SignOutButton />}
    >
      <div className="space-y-5">
        {!clients || clients.length === 0 ? (
          <EmptyState
            title="Zatím žádní klienti"
            description="Založ prvního klienta a nastav mu začátek programu."
            action={
              <Button full={false} className="mx-auto">
                <Link href="/admin/klienti/novy">Nový klient</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ListGroup>
              {clients.map((client) => {
                const program = programByClient.get(client.id);
                const day = program
                  ? clampedProgramDay(
                      program.start_date,
                      program.duration_days,
                      today,
                    )
                  : null;

                return (
                  <ListRow
                    key={client.id}
                    href={`/admin/klienti/${client.id}`}
                    leading={<Avatar name={client.full_name} />}
                    title={client.full_name || client.email}
                    subtitle={
                      !program
                        ? "Bez programu"
                        : day === 0
                          ? `Začíná ${formatCzechDate(program.start_date)}`
                          : `Den ${day} z ${program.duration_days}`
                    }
                  />
                );
              })}
            </ListGroup>

            <Link href="/admin/klienti/novy" className="block">
              <Button full>Nový klient</Button>
            </Link>
          </>
        )}
      </div>
    </Screen>
  );
}

function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-turquoise-100 text-[15px] font-semibold text-turquoise-700">
      {initials}
    </div>
  );
}
