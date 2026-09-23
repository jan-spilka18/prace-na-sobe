import { requireAdmin } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { publicVapidKey, pushConfigured } from "@/lib/push";
import { VapidGenerator } from "./VapidGenerator";

export const metadata = { title: "Notifikace" };

export default async function NotificationsSetupPage() {
  await requireAdmin();

  const configured = pushConfigured();
  const cronReady = Boolean(process.env.CRON_SECRET);
  const key = publicVapidKey();

  return (
    <Screen
      title="Notifikace"
      subtitle="Nastavení push a naplánovaných úloh"
      back={{ href: "/admin", label: "Klienti" }}
    >
      <div className="space-y-5">
        <section className="space-y-2.5 rounded-group bg-surface p-4">
          <h2 className="font-display text-[19px] font-semibold text-ink">
            Stav
          </h2>
          <StatusRow
            label="Klíče VAPID"
            ok={configured}
            okText={key ? `Nastaveno (${key.slice(0, 12)}…)` : "Nastaveno"}
            failText="Chybí. Vygeneruj je níž."
          />
          <StatusRow
            label="Tajemství pro cron"
            ok={cronReady}
            okText="Nastaveno"
            failText="Chybí. Bez něj se připomínky nespustí."
          />
        </section>

        <VapidGenerator />

        <section className="space-y-3 rounded-group bg-surface p-4">
          <h2 className="font-display text-[19px] font-semibold text-ink">
            Co s klíči dál
          </h2>
          <ol className="space-y-2.5 text-[15px] leading-relaxed text-ink">
            <li>
              <b>1.</b> Otevři vercel.com, projekt <b>prace-na-sobe</b>, záložku{" "}
              <b>Settings</b> a v ní <b>Environment Variables</b>.
            </li>
            <li>
              <b>2.</b> Přidej všechny čtyři hodnoty pod jmény, která u nich
              nahoře svítí. Každou zvlášť, tlačítkem Add Another.
            </li>
            <li>
              <b>3.</b> Nahoře přepni na záložku <b>Deployments</b>, u
              nejnovějšího klepni na tři tečky a dej <b>Redeploy</b>. Bez toho
              se nové hodnoty nenačtou.
            </li>
            <li>
              <b>4.</b> Vrať se sem. Nahoře ve Stavu musí svítit obojí zeleně.
            </li>
          </ol>
          <p className="text-[14px] leading-snug text-ink-600">
            Soukromý klíč ani tajemství nikam neposílej a nikam si je neukládej
            do zpráv. Když se ztratí, vygeneruješ si tady nové.
          </p>
        </section>
      </div>
    </Screen>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  failText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  failText: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
          ok ? "bg-turquoise" : "bg-danger"
        }`}
      />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">{label}</p>
        <p className="text-[14px] leading-snug text-ink-600">
          {ok ? okText : failText}
        </p>
      </div>
    </div>
  );
}
