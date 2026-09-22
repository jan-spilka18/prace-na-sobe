import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Card, ListGroup, ListRow } from "@/components/ui/List";
import { clampedProgramDay, formatCzechDate, todayISO } from "@/lib/date";
import { ProgramForm } from "./ProgramForm";
import { DangerZone } from "./DangerZone";

export default async function ClientDetailPage({
  params,
}: PageProps<"/admin/klienti/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("client_id", id)
    .eq("status", "active")
    .maybeSingle();

  const today = todayISO();
  const day = program
    ? clampedProgramDay(program.start_date, program.duration_days, today)
    : null;

  return (
    <Screen
      title={client.full_name || client.email}
      subtitle={client.email}
      back={{ href: "/admin", label: "Klienti" }}
    >
      <div className="space-y-6">
        {program && (
          <Card className="bg-turquoise text-white">
            <p className="text-[15px] opacity-90">
              {day === 0 ? "Program začíná" : "Den"}
            </p>
            {day === 0 ? (
              <p className="mt-1 text-[24px] font-bold leading-tight">
                {formatCzechDate(program.start_date)}
              </p>
            ) : (
              <p className="mt-1 text-[44px] font-bold leading-none tracking-tight">
                {day}
                <span className="ml-1 text-[22px] font-semibold opacity-80">
                  z {program.duration_days}
                </span>
              </p>
            )}
          </Card>
        )}

        <ListGroup title="Účet">
          <ListRow title="E-mail" trailing={client.email} />
          <ListRow
            title="Účet založen"
            trailing={formatCzechDate(client.created_at.slice(0, 10))}
          />
          <ListRow
            title="Návod na plochu"
            trailing={client.onboarded_at ? "Prošel" : "Zatím ne"}
          />
        </ListGroup>

        {program ? (
          <ProgramForm program={program} />
        ) : (
          <ListGroup
            title="Program"
            footer="Klient nemá aktivní program. Bez něj neuvidí výzvu."
          >
            <ListRow title="Bez programu" />
          </ListGroup>
        )}

        <ListGroup
          title="Návyky"
          footer="Zadávání a předvyplňování návyků přibude v další etapě."
        >
          <ListRow title="Zatím nedostupné" />
        </ListGroup>

        <DangerZone
          clientId={client.id}
          clientName={client.full_name || client.email}
        />
      </div>
    </Screen>
  );
}
