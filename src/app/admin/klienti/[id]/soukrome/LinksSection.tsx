"use client";

import { useState, useTransition } from "react";
import { PrivateBlock } from "@/components/PrivateBlock";
import { createLink, deleteLink } from "@/app/actions/private";
import type { ClientLink } from "@/lib/database.types";

/**
 * Odkazy ke klientovi — nahrávky, dokumenty, sdílené složky.
 *
 * Adresa projde přes safeUrl(), takže se sem nedá uložit `javascript:…`
 * ani nic jiného, co není http.
 */
export function LinksSection({
  clientId,
  links,
}: {
  clientId: string;
  links: ClientLink[];
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function add() {
    setError(undefined);
    startTransition(async () => {
      const result = await createLink({ clientId, title, url });
      if (result.error) return setError(result.error);
      setTitle("");
      setUrl("");
    });
  }

  function remove(linkId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteLink(linkId);
      if (result.error) return setError(result.error);
    });
  }

  const field =
    "w-full rounded-card border border-white/15 bg-white/10 px-3 py-2.5 text-[15px] text-white placeholder:text-white/40 focus:border-sun focus:outline-none";

  return (
    <PrivateBlock
      title="Odkazy"
      hint="Jen pro tebe — nahrávky, dokumenty, složky."
    >
      <div className="space-y-3">
        {links.length > 0 && (
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-center gap-3 rounded-card border border-white/12 bg-white/5 px-3 py-2.5"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-[15px] font-medium text-white">
                    {link.title}
                  </span>
                  <span className="block truncate text-[13px] text-white/45">
                    {link.url}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => remove(link.id)}
                  disabled={pending}
                  aria-label={`Smazat odkaz ${link.title}`}
                  className="shrink-0 text-[13px] text-white/45"
                >
                  Smazat
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          value={title}
          placeholder="Název, třeba Nahrávka z 12. 2."
          onChange={(event) => setTitle(event.target.value)}
          className={field}
        />
        <input
          value={url}
          inputMode="url"
          placeholder="https://…"
          onChange={(event) => setUrl(event.target.value)}
          className={field}
        />

        <button
          type="button"
          onClick={add}
          disabled={pending || title.trim() === "" || url.trim() === ""}
          className="min-h-[40px] w-full rounded-card bg-sun text-[15px] font-semibold text-on-sun disabled:opacity-40"
        >
          {pending ? "Ukládám…" : "Přidat odkaz"}
        </button>

        {error && (
          <p role="alert" className="text-[14px] text-sun">
            {error}
          </p>
        )}
      </div>
    </PrivateBlock>
  );
}
