import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("arquivo .ics", () => {
  const ics = buildIcs({
    uid: "abc@calenvia",
    title: "Corte masculino — Barbearia do Zé",
    description: "Com Zé Carlos",
    location: "Rua A, 100; Centro",
    start: new Date("2026-11-21T17:30:00Z"),
    end: new Date("2026-11-21T18:00:00Z"),
    now: new Date("2026-11-14T00:00:00Z"),
  });
  it("tem as datas em UTC e o evento", () => {
    expect(ics).toContain("DTSTART:20261121T173000Z");
    expect(ics).toContain("DTEND:20261121T180000Z");
    expect(ics).toContain("SUMMARY:Corte masculino — Barbearia do Zé");
    expect(ics).toContain("LOCATION:Rua A\\, 100\; Centro");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
  it("linhas com no máximo 75 bytes", () => {
    const long = buildIcs({ uid: "x", title: "á".repeat(100), start: new Date(), end: new Date() });
    for (const line of long.split("\r\n"))
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });
});
