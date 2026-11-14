"use client";

import { useState, useTransition } from "react";
import { readableTextOn } from "@/lib/color";
import { submitReviewAction } from "../actions";

const LABELS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

export function ReviewForm({ slug, code, accent }: { slug: string; code: string; accent: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p
        role="status"
        className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 text-lg font-semibold"
      >
        Obrigado pela avaliação! 💛
      </p>
    );
  }
  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await submitReviewAction({ slug, code, rating, comment });
          if (r.ok) setDone(true);
          else setError(r.error);
        });
      }}
    >
      <fieldset>
        <legend className="mb-3 font-semibold">Sua nota</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                className="peer sr-only"
                checked={rating === n}
                onChange={() => setRating(n)}
                aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"} (${LABELS[n]})`}
              />
              <span
                aria-hidden="true"
                className="inline-flex size-14 items-center justify-center rounded-xl border border-white/15 text-3xl peer-focus-visible:outline peer-focus-visible:outline-2"
                style={{ color: n <= rating ? accent : "rgba(255,255,255,.35)" }}
              >
                ★
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 min-h-6 text-night-sub">{LABELS[rating]}</p>
      </fieldset>
      <label className="block space-y-1.5">
        <span className="block font-semibold">Quer contar mais? (opcional)</span>
        <textarea
          rows={4}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="block w-full rounded-[var(--radius-control)] border border-white/20 bg-white/5 px-4 py-3 text-base"
        />
      </label>
      {error ? (
        <p role="alert" className="font-semibold text-red-300">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!rating || pending}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] text-[17px] font-bold disabled:opacity-50"
        style={{ background: accent, color: readableTextOn(accent) }}
      >
        {pending ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
