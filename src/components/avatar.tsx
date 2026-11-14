/** Foto do profissional ou iniciais (sem JavaScript no cliente). */
export function Avatar({
  name,
  url,
  size = 48,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  );
}
