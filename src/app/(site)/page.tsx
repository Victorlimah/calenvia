import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeader } from "@/components/site/landing-header";
import { PhoneDemo } from "@/components/site/phone-demo";
import { TemplatesShowcase } from "@/components/site/templates-showcase";
import { RevealOnScroll } from "@/components/site/reveal";
import { appUrl, businessUrl, rootDomain, siteUrl } from "@/lib/hosts";
import { getCurrentPrices } from "@/lib/billing/prices-server";
import { isBillingEnabled } from "@/lib/config/access";
import { AccessSection } from "@/components/site/access-section";
import { PricingSection } from "@/components/site/pricing-section";
import "./landing.css";
import { VisitBeacon } from "@/components/site/visit-beacon";
import { RefCapture } from "@/components/site/ref-capture";

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
      "Página de agendamento própria, confirmação e lembrete automáticos no WhatsApp. Para salões, manicures, clínicas, pet shops, personal trainers, barbearias e todo negócio com horário marcado.",
  },
  twitter: { card: "summary_large_image" },
};

/** Preços vêm do banco (CAL-115) e a página se atualiza a cada 5 minutos. */
export const revalidate = 300;

export default async function SiteHome() {
  // CAL-138: sem cobrança, nada de preço nem "criar conta": a home pede acesso por convite.
  const billing = isBillingEnabled();
  const cta = billing ? "#planos" : "#acesso";
  const root = rootDomain().replace(/:\d+$/, "") === "localhost" ? "calenvia.com.br" : rootDomain();
  return (
    <div className="lp" id="landing">
      <RevealOnScroll rootId="landing" />
      <VisitBeacon />
      <RefCapture />
      <LandingHeader loginUrl={appUrl("/entrar")} billing={billing} />
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
                <a href={cta} className="btn btn-primary">
                  {billing ? "Quero minha agenda online" : "Pedir meu acesso"}
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
                <a href={businessUrl("demo", "/")} className="btn btn-ghost">
                  Ver uma demonstração
                </a>
              </div>
              <p className="marquee-label">Funciona para quem trabalha com horário marcado:</p>
              <div className="marquee">
                <div className="marquee-track">
                  <div className="marquee-group">
                    <span className="chip">Salões de beleza</span>
                    <span className="chip">Manicures</span>
                    <span className="chip">Barbearias</span>
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
                    <span className="chip">Salões de beleza</span>
                    <span className="chip">Manicures</span>
                    <span className="chip">Barbearias</span>
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
                  stroke="#4b3fd9"
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
                  stroke="#4b3fd9"
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
                  stroke="#4b3fd9"
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

        <section className="section" id="temas">
          <div className="container">
            <div className="section-head reveal">
              <p className="eyebrow">Veja como fica</p>
              <h2>Uma página com a cara do seu negócio</h2>
              <p className="lead">
                Escolha entre 12 estilos — delicado, clínico, alegre, natural, editorial e mais — e
                ajuste cores, fontes e logo. Você vê a sua página antes de publicar.
              </p>
            </div>
            <TemplatesShowcase />
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

        {billing ? <PricingSection prices={await getCurrentPrices()} /> : <AccessSection />}

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
              {/* Planos e cotas só com a cobrança ligada (CAL-138). */}
              {billing ? (
                <>
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
                      Pode. Comece no plano que faz sentido hoje e mude para o Pro ou o Pro+ quando
                      o movimento crescer.
                    </p>
                  </details>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="final reveal">
              <h2>Seu próximo cliente pode agendar hoje à noite. Sem te chamar.</h2>
              <p>Monte sua página em minutos e coloque o link na bio ainda hoje.</p>
              <a href={cta} className="btn btn-white">
                {billing ? "Começar agora" : "Pedir meu acesso"}
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
            <a href={cta}>{billing ? "Planos" : "Pedir acesso"}</a>
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
