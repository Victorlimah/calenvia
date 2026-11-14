#!/usr/bin/env bash
# Teste de restauração (CAL-092). ATENÇÃO: apaga e recria o banco LOCAL.
#   scripts/restore-check.sh backups/calenvia-AAAAMMDD-HHMM.tar.gz[.enc] --yes
# 1) recria o schema pelas migrations (sem seed); 2) carrega os dados do backup;
# 3) confere se cada tabela tem a mesma quantidade de linhas do momento do backup.
set -euo pipefail

FILE="${1:-}"
[[ -f "$FILE" ]] || { echo "Uso: $0 <backup.tar.gz[.enc]> --yes"; exit 2; }
[[ "${2:-}" == "--yes" ]] || { echo "Isto apaga o banco local. Rode de novo com --yes."; exit 2; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [[ "$FILE" == *.enc ]]; then
  : "${BACKUP_PASSPHRASE:?Defina BACKUP_PASSPHRASE para abrir o backup criptografado}"
  openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$FILE" -out "$WORK/b.tar.gz"
  FILE="$WORK/b.tar.gz"
fi
tar -C "$WORK" -xzf "$FILE"

# Restauração local: superusuário do container (tabelas internas do auth/storage têm outros donos).
run_psql() {
  if command -v psql >/dev/null; then
    psql "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -At "$@"
  else
    docker exec -i "$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)" \
      psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -At "$@"
  fi
}

echo "→ Recriando o banco local pelas migrations (sem seed)…"
npx supabase db reset --no-seed >/dev/null

echo "→ Carregando os dados do backup…"
{
  echo "set session_replication_role = replica;"
  # O bucket de imagens é criado pelas migrations e também vem no backup.
  echo "truncate storage.buckets cascade;"
  cat "$WORK/data.sql"
} | run_psql -q -1 -f - >/dev/null

echo "→ Conferindo as contagens…"
run_psql -c "
  select format('select %L || chr(9) || count(*) from public.%I;', tablename, tablename)
  from pg_tables where schemaname = 'public' order by tablename" > "$WORK/q.sql"
run_psql -f - < "$WORK/q.sql" > "$WORK/after.tsv"

if diff -u "$WORK/counts.tsv" "$WORK/after.tsv"; then
  echo "✓ Restauração conferida: $(wc -l < "$WORK/after.tsv") tabelas com as mesmas contagens."
else
  echo "✗ As contagens não batem (diferenças acima)."
  exit 1
fi
