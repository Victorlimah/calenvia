/** Peças só de leitura da visão "ver como o cliente" (CAL-114, fase 4). */
import { Card } from "@/components/ui";

export function ViewSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function ViewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

export function YesNo({ value }: { value: boolean }) {
  return <>{value ? "Sim" : "Não"}</>;
}
