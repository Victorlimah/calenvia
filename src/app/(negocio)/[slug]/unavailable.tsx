export function Unavailable({ name }: { name: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-extrabold">{name}</h1>
      <p className="text-night-sub mt-3 max-w-sm">
        A agenda online está indisponível no momento. Fale diretamente com o estabelecimento para
        marcar seu horário.
      </p>
    </main>
  );
}
