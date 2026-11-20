export function Unavailable({ name }: { name: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-t-display text-3xl font-extrabold">{name}</h1>
      <p className="mt-3 max-w-sm text-t-sub">
        A agenda online está indisponível no momento. Fale diretamente com o estabelecimento para
        marcar seu horário.
      </p>
    </main>
  );
}
