"use client";

import { setReviewPublishedAction } from "@/app/(painel)/painel/(app)/_actions/reviews";
import { useAction } from "@/components/painel/use-action";
import { Button } from "@/components/ui";

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const { run, pending } = useAction();
  return (
    <Button
      variant={published ? "ghost" : "outline"}
      size="sm"
      loading={pending}
      onClick={() => run(() => setReviewPublishedAction(id, !published))}
    >
      {published ? "Tirar da página" : "Mostrar na página"}
    </Button>
  );
}
