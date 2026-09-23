"use client";

import { useState, useTransition } from "react";
import { PrivateBlock } from "@/components/PrivateBlock";
import { Markdown } from "@/components/Markdown";
import { createNote, deleteNote, updateNote } from "@/app/actions/private";
import { formatCzechDate } from "@/lib/date";
import type { ClientNote } from "@/lib/database.types";

/**
 * Soukromé poznámky ke klientovi. Nejnovější nahoře.
 *
 * Poznámky jsou samostatné záznamy, ne jedno dlouhé pole: u dlouhodobé práce
 * je podstatné, kdy si Honza co všiml, a jeden slepenec by tu informaci
 * zahodil.
 */
export function NotesSection({
  clientId,
  notes,
}: {
  clientId: string;
  notes: ClientNote[];
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function add() {
    if (draft.trim() === "") return;
    setError(undefined);
    startTransition(async () => {
      const result = await createNote({ clientId, body: draft });
      if (result.error) return setError(result.error);
      setDraft("");
    });
  }

  function saveEdit(noteId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await updateNote({ noteId, body: editDraft });
      if (result.error) return setError(result.error);
      setEditing(null);
    });
  }

  function remove(noteId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteNote(noteId);
      if (result.error) return setError(result.error);
    });
  }

  return (
    <PrivateBlock title="Poznámky" hint="Jen pro tebe. Klient je nikdy neuvidí.">
      <div className="space-y-3">
        <textarea
          value={draft}
          rows={3}
          placeholder="Co tě napadlo, co si chceš zapamatovat…"
          onChange={(event) => setDraft(event.target.value)}
          className="w-full resize-y rounded-card border border-white/15 bg-white/10 px-3 py-2.5 text-[15px] leading-relaxed text-white placeholder:text-white/40 focus:border-sun focus:outline-none"
        />

        <button
          type="button"
          onClick={add}
          disabled={pending || draft.trim() === ""}
          className="min-h-[40px] w-full rounded-card bg-sun text-[15px] font-semibold text-ink disabled:opacity-40"
        >
          {pending ? "Ukládám…" : "Přidat poznámku"}
        </button>

        {error && (
          <p role="alert" className="text-[14px] text-sun">
            {error}
          </p>
        )}

        {notes.length === 0 ? (
          <p className="py-2 text-[14px] text-white/50">
            Zatím tu nic není.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-card border border-white/12 bg-white/5 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <time className="text-[12px] font-semibold uppercase tracking-wide text-white/45">
                    {formatCzechDate(note.created_at.slice(0, 10))}
                  </time>

                  <div className="flex shrink-0 gap-3 text-[13px]">
                    {editing === note.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="text-white/60"
                        >
                          Zrušit
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(note.id)}
                          disabled={pending}
                          className="font-semibold text-sun"
                        >
                          Uložit
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(note.id);
                            setEditDraft(note.body);
                          }}
                          className="text-white/70"
                        >
                          Upravit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(note.id)}
                          disabled={pending}
                          className="text-white/45"
                        >
                          Smazat
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editing === note.id ? (
                  <textarea
                    value={editDraft}
                    rows={4}
                    autoFocus
                    onChange={(event) => setEditDraft(event.target.value)}
                    className="mt-2 w-full resize-y rounded-card border border-white/15 bg-white/10 px-3 py-2 text-[15px] leading-relaxed text-white focus:border-sun focus:outline-none"
                  />
                ) : (
                  <Markdown
                    source={note.body}
                    tone="dark"
                    className="mt-1.5 text-[15px]"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PrivateBlock>
  );
}
