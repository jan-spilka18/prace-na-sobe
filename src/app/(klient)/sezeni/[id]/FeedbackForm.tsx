"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { saveFeedback } from "@/app/actions/sessions";
import { FEEDBACK_MOODS } from "@/lib/sessionTemplate";
import type { SessionFeedback } from "@/lib/database.types";

const OTHER = "__jine";

/**
 * Zpětná vazba po sezení.
 *
 * Hlavní je otázka, co si klient odnáší — kvůli ní je to velké pole nahoře.
 * Zbytek jsou rychlé odpovědi na klepnutí: hodnocení 1–10, téma, které ho
 * bavilo nejvíc (z témat, která Honza k sezení nabídl, nebo vlastní), a jak
 * se cítí. Nic není povinné, stačí cokoli z toho.
 *
 * Tmavá karta, ať se na konci dlouhého zápisu nedá přehlédnout.
 */
export function FeedbackForm({
  sessionId,
  topics,
  feedback,
}: {
  sessionId: string;
  topics: string[];
  feedback: SessionFeedback | null;
}) {
  const savedTopic = feedback?.favorite_topic ?? "";
  const [takeaway, setTakeaway] = useState(feedback?.takeaway ?? "");
  const [rating, setRating] = useState<number | null>(feedback?.rating ?? null);
  const [topic, setTopic] = useState<string | null>(
    savedTopic === "" ? null : topics.includes(savedTopic) ? savedTopic : OTHER,
  );
  const [otherTopic, setOtherTopic] = useState(
    topics.includes(savedTopic) ? "" : savedTopic,
  );
  const [mood, setMood] = useState<string | null>(feedback?.feeling || null);
  const [editing, setEditing] = useState(!feedback);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Starší zpětná vazba měla pocit jako volný text. Zůstane mezi volbami,
  // ať se při úpravě neztratí.
  const moods =
    mood && !FEEDBACK_MOODS.includes(mood) ? [mood, ...FEEDBACK_MOODS] : FEEDBACK_MOODS;

  // Bez nabídnutých témat (starší sezení) zbývá jen vlastní odpověď.
  const choosingOther = topic === OTHER || topics.length === 0;
  const favoriteTopic = choosingOther ? otherTopic.trim() : (topic ?? "");

  const empty =
    takeaway.trim() === "" && rating === null && favoriteTopic === "" && !mood;

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveFeedback({
        sessionId,
        takeaway,
        rating,
        favoriteTopic,
        feeling: mood ?? "",
      });
      if (result.error) return setError(result.error);
      setEditing(false);
    });
  }

  return (
    <section
      id="zpetna-vazba"
      // Odsazení pro kotvu: bez něj skok schová nadpis pod lepivou lištu.
      className="scroll-mt-16 rounded-group bg-night px-5 py-6 text-white"
    >
      {editing ? (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-sun">
              Tvoje zpětná vazba
            </p>
            <h2 className="font-display text-[24px] font-extrabold leading-tight tracking-tight">
              Co si z dneška odnášíš?
            </h2>
            <p className="text-[14px] leading-snug text-white/70">
              Jedna věc, kterou si chceš zapamatovat. Uvidí ji jen Honza.
            </p>
          </div>

          <textarea
            aria-label="Co si z dneška odnášíš"
            value={takeaway}
            rows={4}
            placeholder="Dnes jsem si uvědomil, že…"
            onChange={(event) => setTakeaway(event.target.value)}
            className={FIELD}
          />

          <fieldset className="space-y-2.5">
            <legend className="mb-2.5 text-[15px] font-semibold">
              Jak hodnotíš dnešní sezení?
            </legend>
            {/* Dvě řady po pěti: deset koleček vedle sebe by bylo pod 44 px. */}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rating === value}
                  aria-label={`${value} z 10`}
                  onClick={() => setRating(rating === value ? null : value)}
                  className={cn(
                    "h-11 rounded-full text-[16px] font-bold tabular-nums transition-colors",
                    rating === value
                      ? "bg-sun text-on-sun"
                      : "bg-white/10 text-white active:bg-white/20",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="flex justify-between px-1 text-[12px] text-white/60">
              <span>1 = nic moc</span>
              <span>10 = skvělé</span>
            </p>
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className="mb-2.5 text-[15px] font-semibold">
              Co tě dnes bavilo nejvíc?
            </legend>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {[...topics, OTHER].map((option) => (
                  <Chip
                    key={option}
                    selected={topic === option}
                    onClick={() => setTopic(topic === option ? null : option)}
                  >
                    {option === OTHER ? "Jiné" : option}
                  </Chip>
                ))}
              </div>
            )}
            {choosingOther && (
              <input
                type="text"
                aria-label="Jiné téma"
                value={otherTopic}
                maxLength={120}
                placeholder="Napiš, co to bylo"
                onChange={(event) => setOtherTopic(event.target.value)}
                className={cn(FIELD, "min-h-[44px]")}
              />
            )}
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className="mb-2.5 text-[15px] font-semibold">
              Jak se po sezení cítíš?
            </legend>
            <div className="flex flex-wrap gap-2">
              {moods.map((option) => (
                <Chip
                  key={option}
                  selected={mood === option}
                  onClick={() => setMood(mood === option ? null : option)}
                >
                  {option}
                </Chip>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-[14px] text-danger">{error}</p>}

          <button
            type="button"
            disabled={pending || empty}
            onClick={submit}
            className="h-[52px] w-full rounded-full bg-turquoise text-[16px] font-extrabold text-on-sun transition-opacity active:opacity-70 disabled:opacity-40"
          >
            {pending ? "Odesílám…" : feedback ? "Uložit změny" : "Poslat Honzovi"}
          </button>
        </div>
      ) : (
        <Sent
          takeaway={takeaway.trim()}
          rating={rating}
          favoriteTopic={favoriteTopic}
          mood={mood}
          onEdit={() => setEditing(true)}
        />
      )}
    </section>
  );
}

const FIELD =
  "w-full rounded-card border border-white/15 bg-white/[0.08] px-3.5 py-3 text-[16px] leading-relaxed text-white placeholder:text-white/45 focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise/30";

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-[40px] max-w-full truncate rounded-full border px-3.5 text-[14px] font-semibold transition-colors",
        selected
          ? "border-sun bg-sun text-on-sun"
          : "border-white/30 text-white active:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function Sent({
  takeaway,
  rating,
  favoriteTopic,
  mood,
  onEdit,
}: {
  takeaway: string;
  rating: number | null;
  favoriteTopic: string;
  mood: string | null;
  onEdit: () => void;
}) {
  const details = [
    rating !== null ? `Hodnocení ${rating}/10` : null,
    favoriteTopic ? `Nejvíc bavilo: ${favoriteTopic}` : null,
    mood ? `Po sezení: ${mood.toLowerCase()}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-turquoise text-on-sun">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h2 className="font-display text-[22px] font-extrabold tracking-tight">
        Díky, Honza to má
      </h2>
      {takeaway && (
        <p className="text-[16px] leading-relaxed text-white/90">„{takeaway}“</p>
      )}
      {details.length > 0 && (
        <p className="text-[14px] leading-relaxed text-white/65">
          {details.join(" · ")}
        </p>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="mt-1 min-h-[40px] rounded-full border border-white/30 px-4 text-[14px] font-semibold active:bg-white/10"
      >
        Upravit
      </button>
    </div>
  );
}
