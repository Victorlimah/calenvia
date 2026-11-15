import { Logo } from "@/components/logo";

/** Telas de pagamento (CAL-076): fora do shell do painel, que exige assinatura ativa. */
export default function CobrancaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto w-full max-w-xl px-4 pt-6">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-40">{children}</main>
    </div>
  );
}
