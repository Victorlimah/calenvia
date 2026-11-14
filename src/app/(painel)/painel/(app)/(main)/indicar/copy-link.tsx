"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      block
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }}
    >
      {copied ? "Copiado!" : "Copiar link"}
    </Button>
  );
}
