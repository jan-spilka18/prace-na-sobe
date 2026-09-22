#!/usr/bin/env bash
#
# Ověří migrace a politiky Row Level Security proti dočasnému Postgresu.
# Nepotřebuje Supabase ani síť — `00_supabase_stub.sql` napodobí schéma `auth`.
#
#   ./supabase/tests/run.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGPORT="${PGPORT:-55432}"
WORKDIR="$(mktemp -d)"
SOCKET="$WORKDIR/socket"

# initdb odmítá běžet pod rootem, v kontejnerech je to ale běžné.
RUNNER=""
if [ "$(id -u)" = "0" ]; then
  RUNNER="su postgres -c"
fi

run_pg() {
  if [ -n "$RUNNER" ]; then su postgres -c "$1"; else bash -c "$1"; fi
}

# Musí běžet přes stejného uživatele jako start, jinak úklid tiše selže
# a server zůstane viset na pozadí.
cleanup() {
  run_pg "$PGBIN/pg_ctl -D $WORKDIR/data stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

mkdir -p "$WORKDIR/data" "$SOCKET"
if [ -n "$RUNNER" ]; then
  chown -R postgres:postgres "$WORKDIR"
  chmod 700 "$WORKDIR/data"
fi

run_pg "$PGBIN/initdb -D $WORKDIR/data -U postgres --auth=trust" >/dev/null
# -h '' vypne TCP a nechá jen unixový socket ve vlastním adresáři. Díky tomu
# si dva souběžné běhy nesáhnou na stejný port.
run_pg "$PGBIN/pg_ctl -D $WORKDIR/data -o \"-p $PGPORT -k $SOCKET -h ''\" -l $WORKDIR/server.log start" >/dev/null

PSQL="psql -h $SOCKET -p $PGPORT -U postgres -q -v ON_ERROR_STOP=1"

# schema.sql je to, co se doopravdy vkládá do Supabase, takže se testuje ono.
# Kdyby zestárlo proti migracím, test by ověřoval něco jiného, než co poběží.
"$REPO_ROOT/scripts/build-schema.sh" > /dev/null
if ! git -C "$REPO_ROOT" diff --quiet -- supabase/schema.sql 2>/dev/null; then
  echo "CHYBA: supabase/schema.sql neodpovídá migracím." >&2
  echo "Přegeneroval jsem ho — zkontroluj změnu a zacommituj." >&2
  exit 1
fi

$PSQL -c "create database app;" >/dev/null
$PSQL -d app -f "$REPO_ROOT/supabase/tests/00_supabase_stub.sql" >/dev/null

echo "schéma: supabase/schema.sql"
$PSQL -d app -f "$REPO_ROOT/supabase/schema.sql" >/dev/null

echo
output="$(psql -h "$SOCKET" -p "$PGPORT" -U postgres -q -d app -P pager=off \
  -f "$REPO_ROOT/supabase/tests/01_rls_test.sql" 2>&1)"

echo "$output" | grep -E 'ok:|SELHALO|ERROR' | sed 's/^ *//' | sed 's/^psql:.*NOTICE:  //'

passed="$(echo "$output" | grep -oE 'ok: ' | wc -l | tr -d ' ')"
failed="$(echo "$output" | grep -cE 'SELHALO' || true)"
errors="$(echo "$output" | grep -cE 'ERROR' || true)"

echo
echo "prošlo: $passed   selhalo: $failed   chyb SQL: $errors"

if [ "$failed" != "0" ] || [ "$errors" != "0" ]; then
  exit 1
fi
