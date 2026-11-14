import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeader } from "@/components/site/landing-header";
import { PhoneDemo } from "@/components/site/phone-demo";
import { RevealOnScroll } from "@/components/site/reveal";
import { appUrl, rootDomain, siteUrl } from "@/lib/hosts";
import { DEFAULT_FAIR_USE_LIMIT, PLANS, type PlanId } from "@/lib/plans";
import "./landing.css";
import { VisitBeacon } from "@/components/site/visit-beacon";

export const metadata: Metadata = {
  title: "Calenvia — agendamento online com confirmação no WhatsApp",
  description:
    "Página de agendamento própria para o seu negócio. O cliente escolhe o horário sozinho e recebe a confirmação no WhatsApp.",
  alternates: { canonical: siteUrl("/") },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl("/"),
    siteName: "Calenvia",
    title: "Calenvia — Sua agenda cheia. Seu WhatsApp em paz.",
    description:
      "Página de agendamento própria, confirmação e lembrete automáticos no WhatsApp. Para barbearias, salões, clínicas e todo negócio com horário marcado.",
  },
  twitter: { card: "summary_large_image" },
};

function price(id: PlanId) {
  return (PLANS[id].priceCents / 100).toFixed(2).replace(".", ",");
}

function signup(id: PlanId) {
  return appUrl(`/cadastro?plano=${id}`);
}

export default function SiteHome() {
  const root = rootDomain().replace(/:\d+$/, "") === "localhost" ? "calenvia.com.br" : rootDomain();
  return (
    <div className="lp" id="landing">
      <RevealOnScroll rootId="landing" />
      <VisitBeacon />
      <LandingHeader loginUrl={appUrl("/entrar")} />
      <main id="topo">
        <section className="hero">
          <div className="hero-grid container">
            <div className="reveal">
              <div className="badge">
                <span className="dot"></span>Agendamento online + WhatsApp automático
              </div>
              <h1>
                Sua agenda cheia. <span>Seu WhatsApp em paz.</span>
              </h1>
              <p className="lead">
                Seu negócio ganha uma página de agendamento própria. Seus clientes escolhem o
                horário sozinhos, a qualquer hora, e a confirmação chega no WhatsApp deles
                automaticamente.
              </p>
              <div className="hero-ctas">
                <a href="#planos" className="btn btn-primary">
                  Quero minha agenda online
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
                <a href="#como-funciona" className="btn btn-ghost">
                  Ver como funciona
                </a>
              </div>
              <p className="marquee-label">Funciona para quem trabalha com horário marcado:</p>
              <div className="marquee">
                <div className="marquee-track">
                  <div className="marquee-group">
                    <span className="chip">Barbearias</span>
                    <span className="chip">Salões de beleza</span>
                    <span className="chip">Manicures</span>
                    <span className="chip">Estética</span>
                    <span className="chip">Lash designers</span>
                    <span className="chip">Designers de sobrancelha</span>
                    <span className="chip">Clínicas</span>
                    <span className="chip">Consultórios</span>
                    <span className="chip">Psicólogos</span>
                    <span className="chip">Nutricionistas</span>
                    <span className="chip">Fisioterapia</span>
                    <span className="chip">Dentistas</span>
                    <span className="chip">Personal trainers</span>
                    <span className="chip">Studios de pilates</span>
                    <span className="chip">Estúdios de tatuagem</span>
                    <span className="chip">Pet shops</span>
                    <span className="chip">Banho e tosa</span>
                    <span className="chip">Veterinários</span>
                    <span className="chip">Massoterapia</span>
                    <span className="chip">Aulas particulares</span>
                    <span className="chip">Lava-jatos</span>
                    <span className="chip">Fotógrafos</span>
                    <span className="chip">Oficinas mecânicas</span>
                  </div>
                  <div className="marquee-group" aria-hidden="true">
                    <span className="chip">Barbearias</span>
                    <span className="chip">Salões de beleza</span>
                    <span className="chip">Manicures</span>
                    <span className="chip">Estética</span>
                    <span className="chip">Lash designers</span>
                    <span className="chip">Designers de sobrancelha</span>
                    <span className="chip">Clínicas</span>
                    <span className="chip">Consultórios</span>
                    <span className="chip">Psicólogos</span>
                    <span className="chip">Nutricionistas</span>
                    <span className="chip">Fisioterapia</span>
                    <span className="chip">Dentistas</span>
                    <span className="chip">Personal trainers</span>
                    <span className="chip">Studios de pilates</span>
                    <span className="chip">Estúdios de tatuagem</span>
                    <span className="chip">Pet shops</span>
                    <span className="chip">Banho e tosa</span>
                    <span className="chip">Veterinários</span>
                    <span className="chip">Massoterapia</span>
                    <span className="chip">Aulas particulares</span>
                    <span className="chip">Lava-jatos</span>
                    <span className="chip">Fotógrafos</span>
                    <span className="chip">Oficinas mecânicas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="reveal" aria-hidden="true">
              <PhoneDemo rootDomain={root} />
            </div>
          </div>
        </section>

        <section className="section pain">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">Soa familiar?</p>
              <h2>Quanto tempo você perde respondendo “tem horário hoje?”</h2>
            </div>
            <div className="grid-3">
              <article className="pain-card reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8b3ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3>Mensagem o dia inteiro</h3>
                <p>
                  Você para o atendimento para responder cliente, combinar horário e confirmar de
                  novo.
                </p>
              </article>
              <article className="pain-card reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8b3ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <h3>Cliente que esquece e falta</h3>
                <p>Horário vazio é dinheiro que não volta. E ninguém avisou que não vinha.</p>
              </article>
              <article className="pain-card reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8b3ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <h3>Agenda no caderno</h3>
                <p>Horário marcado duas vezes, rasura, e nenhuma ideia de quanto entrou no mês.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="como-funciona">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">Como funciona</p>
              <h2>Em 3 passos seu negócio já está recebendo agendamentos</h2>
            </div>
            <div className="grid-3" style={{ gap: "40px" }}>
              <div className="step reveal">
                <div className="step-n">1</div>
                <h3>Cadastre seu negócio</h3>
                <p>
                  Serviços, preços, profissionais e horário de funcionamento. Leva poucos minutos.
                </p>
              </div>
              <div className="step reveal">
                <div className="step-n">2</div>
                <h3>Divulgue seu link</h3>
                <p>
                  Coloque na bio do Instagram e no WhatsApp Business: <b>seunegocio.{root}</b>
                </p>
              </div>
              <div className="step reveal">
                <div className="step-n">3</div>
                <h3>Receba os agendamentos</h3>
                <p>
                  Tudo cai na sua agenda, e o cliente recebe confirmação e lembrete no WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section features" id="recursos">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">Recursos</p>
              <h2>Tudo o que seu negócio precisa. Nada que complique.</h2>
            </div>
            <div className="grid-3">
              <article className="feature reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <h3>Página própria do seu negócio</h3>
                <p>
                  Com sua logo, suas fotos, suas cores e seus serviços. Bonita e feita para
                  converter.
                </p>
              </article>
              <article className="feature reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <h3>Agenda online 24 horas</h3>
                <p>
                  O cliente só vê horários livres. Sem conflito, sem horário marcado duas vezes.
                </p>
              </article>
              <article className="feature reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <h3>Confirmação e lembrete no WhatsApp</h3>
                <p>Mensagem automática na hora do agendamento e antes do horário. Menos faltas.</p>
              </article>
              <article className="feature reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3>Vários profissionais</h3>
                <p>
                  Cada um com seus serviços e horários. O cliente escolhe com quem quer, ou deixa o
                  sistema escolher.
                </p>
              </article>
              <article className="feature reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h3>Bloqueio de horários</h3>
                <p>Almoço, folga ou compromisso: bloqueie em dois toques e ninguém agenda ali.</p>
              </article>
              <article className="feature reveal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4B3FD9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 15l4-4 3 3 5-6" />
                </svg>
                <h3>Clientes e histórico</h3>
                <p>
                  Quem vem sempre, quem sumiu e quem falta. Tudo organizado pelo WhatsApp do
                  cliente.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="planos">
          <div className="container">
            <div className="section-head center reveal">
              <p className="eyebrow">Planos</p>
              <h2>Um plano para cada tamanho de agenda</h2>
              <p className="lead">
                Comece no que faz sentido hoje e mude quando o movimento crescer.
              </p>
            </div>

            <div className="plans">
              <article className="plan reveal">
                <div>
                  <div className="plan-name">Básico</div>
                  <p className="plan-desc">
                    Para quem quer sair do caderno e ter uma agenda online.
                  </p>
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
                  <li className="note">
                    300 mensagens ≈ 150 agendamentos com confirmação + lembrete.
                  </li>
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

        <section className="section faq" id="duvidas">
          <div className="container">
            <div className="section-head center reveal">
              <p className="eyebrow">Dúvidas</p>
              <h2>Perguntas frequentes</h2>
            </div>
            <div className="faq-list">
              <details className="reveal" open>
                <summary>
                  Meu cliente precisa baixar algum aplicativo?
                  <svg
                    className="chev"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p>
                  Não. Ele abre o link do seu negócio, escolhe o horário e pronto. Funciona em
                  qualquer celular.
                </p>
              </details>
              <details className="reveal">
                <summary>
                  Preciso ter site?
                  <svg
                    className="chev"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p>
                  Não. A Calenvia já cria a página do seu negócio, com seu nome no endereço:
                  seunegocio.{root}.
                </p>
              </details>
              <details className="reveal">
                <summary>
                  Como as mensagens do WhatsApp são enviadas?
                  <svg
                    className="chev"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p>
                  Pela API oficial do WhatsApp, com o nome do seu negócio na mensagem. Seu número
                  pessoal não é usado.
                </p>
              </details>
              <details className="reveal">
                <summary>
                  E se eu passar das 300 mensagens no Pro?
                  <svg
                    className="chev"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p>
                  Os agendamentos continuam normalmente. A confirmação volta a ser pela mensagem
                  pronta até o próximo mês, ou você muda para o Pro+ quando quiser.
                </p>
              </details>
              <details className="reveal">
                <summary>
                  Posso trocar de plano?
                  <svg
                    className="chev"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p>
                  Pode. Comece no plano que faz sentido hoje e mude para o Pro ou o Pro+ quando o
                  movimento crescer.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="final reveal">
              <h2>Seu próximo cliente pode agendar hoje à noite. Sem te chamar.</h2>
              <p>Monte sua página em minutos e coloque o link na bio ainda hoje.</p>
              <a href="#planos" className="btn btn-white">
                Começar agora
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="footer-inner container">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="logo-text" style={{ fontSize: "18px", color: "var(--ink)" }}>
              Calenvia
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="footer-links">
            <a href="#planos">Planos</a>
            <a href="#duvidas">Dúvidas</a>
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Privacidade</Link>
            <a href="https://instagram.com/calenvia.app" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
