import { ButtonLink } from "@/components/ui";

export function StepNav({
  back,
  next,
  disabled,
}: {
  back: string;
  next: string;
  disabled?: boolean;
}) {
  return (
    <div className="border-line flex gap-3 border-t pt-5">
      <ButtonLink href={back} variant="ghost">
        Voltar
      </ButtonLink>
      {disabled ? (
        <span
          aria-disabled="true"
          className="bg-line text-muted inline-flex min-h-14 flex-1 items-center justify-center rounded-[var(--radius-control)] px-6 font-semibold"
        >
          Continuar
        </span>
      ) : (
        <ButtonLink href={next} size="lg" className="flex-1">
          Continuar
        </ButtonLink>
      )}
    </div>
  );
}
