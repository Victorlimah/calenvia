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
    <div className="flex gap-3 border-t border-line pt-5">
      <ButtonLink href={back} variant="ghost">
        Voltar
      </ButtonLink>
      {disabled ? (
        <span
          aria-disabled="true"
          className="inline-flex min-h-14 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-line px-6 font-semibold text-muted"
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
