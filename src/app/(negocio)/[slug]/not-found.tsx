export default function NegocioNotFound() {
  return (
    <main className="bg-night text-night-fg flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-extrabold">Página não encontrada</h1>
      <p className="text-night-sub mt-3 max-w-sm">
        Confira se o endereço está certo. Se o link veio de um estabelecimento, peça o link
        atualizado.
      </p>
      <a href="https://calenvia.com.br" className="mt-6 text-sm underline underline-offset-4">
        Conheça a Calenvia
      </a>
    </main>
  );
}
