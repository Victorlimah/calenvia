import { appUrl } from "@/lib/hosts";
import type { CurrentPrices } from "@/lib/billing/prices";
import { DEFAULT_FAIR_USE_LIMIT, PLANS, type PlanId } from "@/lib/plans";

/**
 * Seção de planos e preços da landing (CAL-083). Guardada para quando a cobrança voltar
 * (CAL-138): só aparece com `BILLING_ENABLED=true`.
 */
function formatPlan(prices: CurrentPrices, id: PlanId) {
  const cents = prices.plans[id].amountCents;
  return (cents / 100).toFixed(2).replace(".", ",");
}

function signup(id: PlanId) {
  return appUrl(`/cadastro?plano=${id}`);
}

export function PricingSection({ prices }: { prices: CurrentPrices }) {
  const price = (id: PlanId) => formatPlan(prices, id);
  return (
    <section className="section" id="planos">
      <div className="container">
        <div className="section-head center reveal">
          <p className="eyebrow">Planos</p>
          <h2>Um plano para cada tamanho de agenda</h2>
          <p className="lead">Comece no que faz sentido hoje e mude quando o movimento crescer.</p>
        </div>

        <div className="plans">
          <article className="plan reveal">
            <div>
              <div className="plan-name">Básico</div>
              <p className="plan-desc">Para quem quer sair do caderno e ter uma agenda online.</p>
            </div>
            <div className="price">
              <span className="cur">R$</span>
              <span className="val">{price("basic")}</span>
              <span className="per">/mês</span>
            </div>
            <a href={signup("basic")} className="btn btn-outline btn-block">
              Escolher Básico
            </a>
            <ul>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Página de agendamento do seu negócio
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Agenda online 24 horas
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Bloqueio de horários
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Cadastro de clientes
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Confirmação pelo WhatsApp com mensagem pronta (você envia)
              </li>
            </ul>
          </article>

          <article className="plan featured reveal">
            <span className="ribbon">RECOMENDADO</span>
            <div>
              <div className="plan-name">Pro</div>
              <p className="plan-desc">Para quem quer o WhatsApp trabalhando sozinho.</p>
            </div>
            <div className="price">
              <span className="cur">R$</span>
              <span className="val">{price("pro")}</span>
              <span className="per">/mês</span>
            </div>
            <a href={signup("pro")} className="btn btn-primary btn-block">
              Escolher Pro
            </a>
            <ul>
              <li className="plus">Tudo do Básico, mais:</li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8b3ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Até {PLANS.pro.monthlyMessages} mensagens automáticas por mês
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8b3ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Confirmação automática no WhatsApp
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8b3ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Lembrete antes do horário
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8b3ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Cliente remarca ou cancela pelo link
              </li>
              <li className="note">300 mensagens ≈ 150 agendamentos com confirmação + lembrete.</li>
            </ul>
          </article>

          <article className="plan reveal">
            <div>
              <div className="plan-name">Pro+</div>
              <p className="plan-desc">Para negócios com agenda cheia e marca própria.</p>
            </div>
            <div className="price">
              <span className="cur">R$</span>
              <span className="val">{price("pro_plus")}</span>
              <span className="per">/mês</span>
            </div>
            <a href={signup("pro_plus")} className="btn btn-outline btn-block">
              Escolher Pro+
            </a>
            <ul>
              <li className="plus">Tudo do Pro, mais:</li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Mensagens automáticas ilimitadas*
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Domínio próprio (seunegocio.com.br)
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Relatórios de faturamento e faltas
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Suporte prioritário
              </li>
              <li className="note">
                *Política de uso justo: até {DEFAULT_FAIR_USE_LIMIT} mensagens por mês.
              </li>
            </ul>
          </article>
        </div>

        <div
          className="compare reveal"
          role="region"
          aria-label="Comparação dos planos (role para os lados)"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">Comparação dos planos da Calenvia</caption>
            <thead>
              <tr>
                <th scope="col">Compare os planos</th>
                <th scope="col">Básico</th>
                <th scope="col" className="hl">
                  Pro
                </th>
                <th scope="col">Pro+</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Preço mensal</td>
                <td>
                  <b>R$ {price("basic")}</b>
                </td>
                <td className="hl">
                  <b>R$ {price("pro")}</b>
                </td>
                <td>
                  <b>R$ {price("pro_plus")}</b>
                </td>
              </tr>
              <tr>
                <td>Página de agendamento própria</td>
                <td className="yes">✓</td>
                <td className="hl yes">✓</td>
                <td className="yes">✓</td>
              </tr>
              <tr>
                <td>Agenda online 24h e bloqueios</td>
                <td className="yes">✓</td>
                <td className="hl yes">✓</td>
                <td className="yes">✓</td>
              </tr>
              <tr>
                <td>Cadastro de clientes</td>
                <td className="yes">✓</td>
                <td className="hl yes">✓</td>
                <td className="yes">✓</td>
              </tr>
              <tr>
                <td>Mensagens automáticas no WhatsApp</td>
                <td className="no">—</td>
                <td className="hl">{PLANS.pro.monthlyMessages}/mês</td>
                <td>Ilimitadas*</td>
              </tr>
              <tr>
                <td>Lembrete antes do horário</td>
                <td className="no">—</td>
                <td className="hl yes">✓</td>
                <td className="yes">✓</td>
              </tr>
              <tr>
                <td>Remarcar e cancelar pelo link</td>
                <td className="no">—</td>
                <td className="hl yes">✓</td>
                <td className="yes">✓</td>
              </tr>
              <tr>
                <td>Domínio próprio</td>
                <td className="no">—</td>
                <td className="hl no">—</td>
                <td className="yes">✓</td>
              </tr>
              <tr>
                <td>Relatórios de faturamento e faltas</td>
                <td className="no">—</td>
                <td className="hl no">—</td>
                <td className="yes">✓</td>
              </tr>
              <tr>
                <td>Suporte prioritário</td>
                <td className="no">—</td>
                <td className="hl no">—</td>
                <td className="yes">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
