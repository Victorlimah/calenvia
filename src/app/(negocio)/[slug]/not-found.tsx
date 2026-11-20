export default function NegocioNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-t-bg px-6 text-center text-t-text">
      <h1 className="font-t-display text-3xl font-extrabold">Página não encontrada</h1>
      <p className="mt-3 max-w-sm text-t-sub">
        Confira se o endereço está certo. Se o link veio de um estabelecimento, peça o link
        atualizado.
      </p>
      <a href="https://calenvia.com.br" className="mt-6 text-sm underline underline-offset-4">
        Conheça a Calenvia
      </a>
    </main>
  );
}
