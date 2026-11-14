# Backups e recuperação (CAL-092)

## O que existe
- **Supabase (produção):** o plano Pro do Supabase faz backup diário automático (7 dias) e
  oferece PITR (recuperação para qualquer minuto) como adicional. **Recomendado ligar antes do beta.**
- **Backup próprio (independente do Supabase):** `.github/workflows/backup.yml` roda todo dia às
  03:00 (Brasília): exporta os dados com `scripts/backup.sh`, criptografa (AES-256, senha em
  `BACKUP_PASSPHRASE`), **testa a restauração** num Supabase descartável e guarda o arquivo por 30
  dias como artifact do GitHub Actions.

## Ligar o backup diário
No GitHub › Settings › Secrets and variables › Actions, crie:
- `SUPABASE_DB_URL`: string de conexão do banco de produção (Supabase › Project Settings › Database,
  “Connection string” no modo *session*).
- `BACKUP_PASSPHRASE`: senha longa e aleatória. **Guarde num gerenciador de senhas**: sem ela o
  backup não abre.

## Comandos
```bash
scripts/backup.sh                                   # backup do banco local
SUPABASE_DB_URL=postgres://… BACKUP_PASSPHRASE=… scripts/backup.sh   # produção
BACKUP_PASSPHRASE=… scripts/restore-check.sh backups/<arquivo>.enc --yes   # ATENÇÃO: recria o banco local
```

O teste de restauração recria o banco local pelas migrations, carrega os dados do backup e compara
a quantidade de linhas de cada tabela com a do momento do backup.

## Restaurar a produção (incidente)
1. Preferir o backup/PITR do próprio Supabase (painel › Database › Backups).
2. Sem ele: criar um projeto Supabase novo, `npx supabase link` + `npx supabase db push` (schema
   pelas migrations), baixar o artifact, abrir com `openssl enc -d -aes-256-cbc -pbkdf2` e carregar
   `data.sql` com `psql` (com `set session_replication_role = replica;`). Conferir com `counts.tsv`.
3. Trocar as variáveis da Vercel para o novo projeto.

## Limites
- Os **arquivos** do Storage (fotos) não entram no dump, só os registros. O Supabase guarda os
  arquivos com redundância; para cópia própria, sincronizar o bucket `business-media` (S3) à parte.
