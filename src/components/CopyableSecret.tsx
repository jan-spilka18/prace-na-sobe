"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function CopyableSecret({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Schránka je bez HTTPS nebo bez souhlasu nedostupná.
      // Hodnota je vidět na obrazovce, takže se dá přepsat ručně.
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-group bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink-500">{label}</div>
        <div
          className={cn(
            "mt-0.5 break-all text-[17px] text-ink",
            mono && "font-mono tracking-tight",
          )}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-card bg-turquoise-100 px-3 py-2 text-[15px] font-semibold text-turquoise-700 active:bg-turquoise-200"
      >
        {copied ? "Zkopírováno" : "Kopírovat"}
      </button>
    </div>
  );
}
