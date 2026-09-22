/**
 * Typy databáze.
 *
 * Až poběží Supabase projekt, dají se přegenerovat příkazem
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 * Do té doby je soubor psaný ručně a musí odpovídat migracím v supabase/migrations.
 */

export type HabitType = "boolean" | "minutes" | "reps";
export type EntryStatus = "done" | "missed";
export type DayStatus = "complete" | "incomplete" | "empty";
export type SessionKind = "coaching" | "breathwork";
export type SessionStatus = "draft" | "published";
export type UserRole = "admin" | "client";
export type ProgramStatus = "active" | "completed" | "archived";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Profile = Timestamps & {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  timezone: string;
  onboarded_at: string | null;
};

export type Program = Timestamps & {
  id: string;
  client_id: string;
  kind: string;
  title: string;
  start_date: string;
  duration_days: number;
  status: ProgramStatus;
};

export type Habit = Timestamps & {
  id: string;
  program_id: string;
  client_id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  type: HabitType;
  position: number;
  archived_at: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_by: string | null;
};

export type HabitTarget = {
  id: string;
  habit_id: string;
  target_value: number;
  effective_from: string;
  created_at: string;
};

export type HabitEntry = Timestamps & {
  id: string;
  habit_id: string;
  client_id: string;
  entry_date: string;
  status: EntryStatus;
  actual_value: number | null;
  target_snapshot: number | null;
  note: string | null;
  backfilled: boolean;
};

export type DaySummary = {
  id: string;
  client_id: string;
  program_id: string;
  day_date: string;
  status: DayStatus;
  evaluated_at: string;
  notified_at: string | null;
};

export type SessionRecord = Timestamps & {
  id: string;
  client_id: string;
  program_id: string | null;
  session_date: string;
  kind: SessionKind;
  status: SessionStatus;
  content: Record<string, string>;
  published_at: string | null;
  external_source: string | null;
  external_id: string | null;
};

export type SessionFeedback = Timestamps & {
  id: string;
  session_id: string;
  client_id: string;
  feeling: string;
  takeaway: string;
};

export type SessionPrep = Timestamps & {
  id: string;
  session_id: string;
  content: string;
};

export type ClientNote = Timestamps & {
  id: string;
  client_id: string;
  body: string;
};

export type ClientLink = Timestamps & {
  id: string;
  client_id: string;
  title: string;
  url: string;
  position: number;
};

export type NotificationSettings = Timestamps & {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  daily_summary_time: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
  failed_at: string | null;
  fail_count: number;
};

/**
 * `Generated` vyjmenovává sloupce, které plní databáze — výchozí hodnotou nebo
 * triggerem. Typ je z zápisu odstraní, aby se aplikace nesnažila poslat
 * hodnotu, kterou stejně trigger přepíše (typicky `client_id` u návyků).
 *
 * Povinnost sloupců tu záměrně neřešíme; hlídá ji NOT NULL v databázi.
 */
type TableDef<Row, Generated extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Partial<Row>, Generated>;
  Update: Omit<Partial<Row>, Generated>;
  Relationships: [];
};

type Audit = "id" | "created_at" | "updated_at";

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, Audit>;
      programs: TableDef<Program, Audit>;
      habits: TableDef<Habit, Audit | "client_id">;
      habit_targets: TableDef<HabitTarget, "id" | "created_at">;
      habit_entries: TableDef<
        HabitEntry,
        Audit | "client_id" | "backfilled" | "target_snapshot"
      >;
      day_summaries: TableDef<DaySummary, "id" | "evaluated_at">;
      sessions: TableDef<SessionRecord, Audit | "published_at">;
      session_feedback: TableDef<SessionFeedback, Audit | "client_id">;
      session_preps: TableDef<SessionPrep, Audit>;
      client_notes: TableDef<ClientNote, Audit>;
      client_links: TableDef<ClientLink, Audit>;
      notification_settings: TableDef<NotificationSettings, "created_at" | "updated_at">;
      push_subscriptions: TableDef<PushSubscriptionRow, "id" | "created_at">;
      app_settings: TableDef<
        { key: string; value: unknown; updated_at: string },
        "updated_at"
      >;
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      habit_target_on: {
        Args: { p_habit_id: string; p_date: string };
        Returns: number | null;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
