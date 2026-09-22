#!/usr/bin/env bash
#
# Spojí všechny migrace do supabase/schema.sql — jednoho souboru, který se
# v Supabase vloží do SQL Editoru najednou. Pouštěj po každé změně migrací.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/supabase/schema.sql"

{
  cat <<'HEADER'
/*
  ════════════════════════════════════════════════════════════════════════
  Práce na sobě — kompletní schéma databáze

  POZOR: tenhle soubor se nepíše ručně.
  Vzniká spojením všech migrací ze supabase/migrations/ příkazem:

      npm run build:schema

  Needituj ho přímo — uprav migraci a soubor přegeneruj.

  ── Jak ho použít ──────────────────────────────────────────────────────
  V Supabase otevři SQL Editor, vlož celý obsah a klikni Run.
  Projede najednou a skončí hláškou Success.
  ════════════════════════════════════════════════════════════════════════
*/

HEADER

  for migration in "$REPO_ROOT"/supabase/migrations/*.sql; do
    printf '\n-- %s\n-- %s\n-- %s\n\n' \
      "═══════════════════════════════════════════════════════════════" \
      "$(basename "$migration")" \
      "═══════════════════════════════════════════════════════════════"
    cat "$migration"
  done
} > "$OUT"

echo "supabase/schema.sql přegenerováno ($(wc -l < "$OUT" | tr -d ' ') řádků)"
