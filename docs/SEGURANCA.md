# Segurança das regras de acesso (CAL-090)

## Como o isolamento entre negócios funciona
- Toda tabela de dados de negócio tem `business_id` e **RLS ligado**; as policies usam
  `is_business_owner(business_id)`. FKs compostas `(id, business_id)` impedem misturar
  serviço/profissional/cliente de negócios diferentes num agendamento.
- O dono não muda `plan`/`plan_status` (privilégio por coluna). `messages`, `message_usage`,
  `product_events` e `rate_limits` só são gravados pelo servidor.
- Views (`customer_summaries`) usam `security_invoker`, então o RLS continua valendo.
- Funções `security definer` fixam `search_path` e não podem ser chamadas pelo anônimo.
- O visitante anônimo não lê nenhuma tabela: a página pública e o agendamento passam pelo
  servidor (service role) com validação de tudo de novo.
- A chave `service_role` só existe em módulos do servidor (`server-only`, server actions, rotas).

## Testes que provam
- `tests/db/security.test.ts` varre o schema inteiro: RLS em toda tabela, views com
  `security_invoker`, funções definer seguras, e para **toda** tabela com `business_id`:
  dono A não lê, não altera, não apaga e não cria nada no negócio B; anônimo não lê nada.
- `tests/db/rls.test.ts`: casos específicos (plano, Storage, horários próprios, clientes).
- `src/lib/security.test.ts`: nenhum componente cliente importa o client service_role ou lê segredos.

Uma tabela nova sem RLS ou policy faz esses testes falharem.
