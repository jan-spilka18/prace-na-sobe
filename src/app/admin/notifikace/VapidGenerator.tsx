"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { CopyableSecret } from "@/components/CopyableSecret";
import { generateVapidKeys, type VapidKeys } from "@/app/actions/vapid";

export function VapidGenerator() {
  const [keys, setKeys] = useState<VapidKeys>();
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      setKeys(await generateVapidKeys());
    });
  }

  if (!keys?.publicKey) {
    return (
      <section className="space-y-3 rounded-group bg-surface p-4">
        <h2 className="font-display text-[19px] font-semibold text-ink">
          Vygenerovat klíče
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-600">
          Klíče se nikam neukládají — ukážou se jednou a je na tobě je přenést
          do Vercelu. Když stránku zavřeš, vygeneruješ si prostě nové.
        </p>
        <p className="text-[14px] leading-snug text-ink-500">
          Pozor: nové klíče zneplatní všechny existující odběry. Klienti si
          budou muset notifikace zapnout znovu.
        </p>

        {keys?.error && (
          <p role="alert" className="text-[14px] text-danger">
            {keys.error}
          </p>
        )}

        <Button onClick={generate} disabled={pending}>
          {pending ? "Generuju…" : "Vygenerovat"}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-group border-l-4 border-sun bg-surface py-3.5 pl-3.5 pr-4">
        <p className="text-[15px] font-semibold text-ink">
          Zkopíruj to teď. Podruhé se to neukáže.
        </p>
        <p className="mt-1 text-[14px] leading-snug text-ink-600">
          Po zavření stránky jsou hodnoty pryč. Nové si vygeneruješ kdykoli.
        </p>
      </div>

      <CopyableSecret
        label="NEXT_PUBLIC_VAPID_PUBLIC_KEY"
        value={keys.publicKey}
        mono
      />
      <CopyableSecret
        label="VAPID_PRIVATE_KEY"
        value={keys.privateKey ?? ""}
        mono
      />
      <CopyableSecret label="CRON_SECRET" value={keys.secret ?? ""} mono />
      <CopyableSecret label="VAPID_SUBJECT" value="mailto:honza@example.com" />

      <p className="px-1 text-[14px] leading-snug text-ink-600">
        U <b>VAPID_SUBJECT</b> nahraď adresu svým e-mailem. Slouží k tomu, aby
        se na tebe provozovatelé notifikací mohli obrátit, kdyby něco.
      </p>
    </section>
  );
}
