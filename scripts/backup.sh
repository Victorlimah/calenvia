#!/usr/bin/env bash
# Backup dos dados da Calenvia (CAL-092).
#   scripts/backup.sh                         → banco local (npx supabase start)
#   SUPABASE_DB_URL=postgres://… scripts/backup.sh   → banco de produção
# Gera backups/calenvia-AAAAMMDD-HHMM.tar.gz (ou .tar.gz.enc com BACKUP_PASSPHRASE) contendo:
#   data.sql   → dados (auth, public, storage) em COPY
#   counts.tsv → quantidade de linhas por tabela do schema public (para conferir a restauração)
set -euo pipefail

OUT_DIR="${BACKUP_DIR:-backups}"
STAMP="$(date -u +%Y%m%d-%H%M)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT_DIR"

run_psql() {
  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -At "$@"
  elif command -v psql >/dev/null; then
    psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -At "$@"
  else
    docker exec -i "$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)" \
      psql -U postgres -v ON_ERROR_STOP=1 -At "$@"
  fi
}

echo "→ Contando linhas…"
run_psql -c "
  select format('select %L || chr(9) || count(*) from public.%I;', tablename, tablename)
  from pg_tables where schemaname = 'public' order by tablename" > "$WORK/count-queries.sql"
run_psql -f - < "$WORK/count-queries.sql" > "$WORK/counts.tsv"

echo "→ Exportando dados…"
REMOTE=()
[[ -n "${SUPABASE_DB_URL:-}" ]] && REMOTE=(--remote="$SUPABASE_DB_URL")
npx supabase db dump "${REMOTE[@]}" --data-only --use-copy -f "$WORK/data.sql" >/dev/null

FILE="$OUT_DIR/calenvia-$STAMP.tar.gz"
tar -C "$WORK" -czf "$FILE" data.sql counts.tsv

if [[ -n "${BACKUP_PASSPHRASE:-}" ]]; then
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -in "$FILE" -out "$FILE.enc"
  rm "$FILE"
  FILE="$FILE.enc"
fi

echo "✓ Backup salvo em $FILE ($(du -h "$FILE" | cut -f1)), $(wc -l < "$WORK/counts.tsv") tabelas."
