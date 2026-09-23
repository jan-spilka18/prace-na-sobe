import { requireProfile } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { APP_SHORT_NAME } from "@/lib/config";

export const metadata = { title: "Na plochu" };

const IPHONE = [
  "Otevři appku v Safari. V Chromu na iPhonu to nejde — Apple tuhle možnost dává jen Safari.",
  "Klepni na ikonu sdílení dole uprostřed: čtvereček se šipkou nahoru.",
  "Sjeď v nabídce níž a vyber Přidat na plochu.",
  `Nahoře potvrď Přidat. Na ploše přibude ikona ${APP_SHORT_NAME}.`,
  "Od teď appku otevírej jen přes tuhle ikonu, ne přes Safari.",
];

const ANDROID = [
  "Otevři appku v Chromu.",
  "Klepni na tři tečky vpravo nahoře.",
  "Vyber Přidat na plochu nebo Nainstalovat aplikaci.",
  "Potvrď. Ikona přibude mezi ostatní aplikace.",
];

export default async function InstallPage() {
  await requireProfile();

  return (
    <Screen
      title="Appka na plochu"
      subtitle="Pár klepnutí a chová se jako běžná aplikace"
      back={{ href: "/nastaveni", label: "Nastavení" }}
    >
      <div className="space-y-5">
        <div className="rounded-group border-l-4 border-sun bg-surface py-3.5 pl-3.5 pr-4">
          <p className="text-[15px] leading-relaxed text-ink">
            Vyplatí se to. Appka bude mít vlastní ikonu, otevře se na jedno
            klepnutí a nebude kolem ní adresní řádek ani panely prohlížeče —
            odškrtnutí návyků je pak otázka pár vteřin.
          </p>
        </div>

        <Steps title="iPhone a iPad" steps={IPHONE} />
        <Steps title="Android" steps={ANDROID} />

        <p className="px-1 text-[14px] leading-relaxed text-ink-600">
          Na počítači se nic instalovat nemusí — appka tam běží v prohlížeči
          jako doteď.
        </p>
      </div>
    </Screen>
  );
}

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="rounded-group bg-surface p-5">
      <h2 className="font-display text-[19px] font-semibold text-ink">
        {title}
      </h2>
      <ol className="mt-3 space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3">
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-turquoise-100 text-[13px] font-semibold tabular-nums text-turquoise-700"
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-[15px] leading-relaxed text-ink">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
