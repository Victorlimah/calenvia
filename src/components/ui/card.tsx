import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("border-line rounded-[var(--radius-card)] border bg-white p-5", className)}
      {...props}
    />
  );
}
