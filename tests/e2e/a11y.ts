import path from "node:path";
import type { Page } from "@playwright/test";

const AXE_PATH = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

export type AxeViolation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
};

/** Roda o axe-core (WCAG 2.0/2.1 A e AA) na página atual. */
export async function axeViolations(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async () => {
    // @ts-expect-error axe é injetado na página
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map((v: AxeViolation) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes
        .slice(0, 5)
        .map((n) => ({ target: n.target, failureSummary: n.failureSummary })),
    }));
  });
}

export function describeViolations(v: AxeViolation[]): string {
  return v
    .map(
      (x) =>
        `${x.impact} ${x.id}: ${x.help}\n  ${x.nodes.map((n) => n.target.join(" ")).join("\n  ")}`,
    )
    .join("\n");
}
