export default async function NegocioHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold">{slug}</h1>
    </main>
  );
}
