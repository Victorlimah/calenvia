import { appUrl } from "@/lib/hosts";
import { supportWaLink } from "@/lib/config/support";
import { AccessRequestForm } from "./access-request-form";

/**
 * "Pedir meu acesso" (CAL-138): no lugar dos planos enquanto a cobrança está desligada.
 * WhatsApp da Calenvia, lista de espera e "Já sou cliente → Entrar".
 */
export function AccessSection() {
  return (
    <section className="section" id="acesso" aria-labelledby="acesso-titulo">
      <div className="container">
        <div className="section-head center reveal">
          <p className="eyebrow">Acesso por convite</p>
          <h2 id="acesso-titulo">Estamos abrindo aos poucos</h2>
          <p className="lead">
            Enquanto montamos a nova fase, as contas são criadas pela nossa equipe. Peça o seu
            acesso: preparamos tudo e você termina a configuração em poucos minutos, sem custo nesta
            fase.
          </p>
        </div>
        <div className="access-grid">
          <div className="access-card reveal">
            <h3>Fale com a gente</h3>
            <p>Mande uma mensagem e respondemos no mesmo dia, em horário comercial.</p>
            <a
              href={supportWaLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Pedir meu acesso no WhatsApp
            </a>
            <p className="access-login">
              Já é cliente? <a href={appUrl("/entrar")}>Entrar no painel</a>
            </p>
          </div>
          <div className="access-card reveal">
            <h3>Ou entre na lista de espera</h3>
            <p>Deixe seu contato e chamamos você quando abrir sua vaga.</p>
            <AccessRequestForm />
          </div>
        </div>
      </div>
    </section>
  );
}
