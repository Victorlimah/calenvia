import { describe, expect, it } from "vitest";
import { closestPalette, dominantColor, initials, logoPrimary } from "./logo";

function pixels(...colors: [number, number, number, number, number][]): number[] {
  // [r, g, b, a, quantidade]
  return colors.flatMap(([r, g, b, a, n]) => Array.from({ length: n }, () => [r, g, b, a]).flat());
}

describe("logo (CAL-143)", () => {
  it("iniciais do monograma sem preposições", () => {
    expect(initials("Studio da Bela Nails")).toBe("SB");
    expect(initials("Barbearia do Zé")).toBe("BZ");
    expect(initials("Zé")).toBe("Z");
    expect(initials("  ")).toBe("?");
    expect(initials("ótica central")).toBe("ÓC");
  });

  it("cor dominante ignora transparente, branco, preto e cinza", () => {
    const rgba = pixels(
      [255, 255, 255, 255, 500], // fundo branco
      [0, 0, 0, 0, 500], // transparente
      [20, 20, 20, 255, 200], // texto preto
      [214, 69, 106, 255, 120], // rosa do logo
      [60, 120, 200, 255, 10], // detalhe azul
    );
    expect(dominantColor(rgba)).toBe("#D6456A");
    expect(dominantColor(pixels([255, 255, 255, 255, 50], [128, 128, 128, 255, 50]))).toBeNull();
  });

  it("paleta mais próxima pelo tom", () => {
    expect(closestPalette("#D6456A").id).toMatch(/rosa|nude/);
    expect(closestPalette("#1F9D55").id).toMatch(/menta|salvia/);
    expect(closestPalette("#2F80ED").id).toMatch(/oceano|marinho|petroleo/);
    expect(closestPalette("#808080").id).toBe("monocromatico");
  });

  it("cor muito clara do logo fica mais firme para virar botão", () => {
    expect(logoPrimary("#FFE0EC")).not.toBe("#FFE0EC");
    expect(logoPrimary("#D6456A")).toBe("#D6456A");
  });
});

describe("qual logo e onde (CAL-143)", () => {
  it("versão escura no fundo escuro; desligado mostra monograma", async () => {
    const { pickLogo, logoPlacements } = await import("./logo");
    const base = { name: "Bela", logoUrl: "a.png", logoAltUrl: "b.png" };
    expect(pickLogo({ ...base, mode: "dark", show: true }).url).toBe("b.png");
    expect(pickLogo({ ...base, mode: "light", show: true }).url).toBe("a.png");
    expect(pickLogo({ ...base, logoAltUrl: null, mode: "dark", show: true }).url).toBe("a.png");
    expect(pickLogo({ ...base, mode: "light", show: false }).url).toBeNull();
    expect(pickLogo({ ...base, mode: "light", show: true }).alt).toBe("Logo da Bela");
    expect(logoPlacements({ logo: {} })).toEqual(["hero"]);
    expect(logoPlacements({ logo: { placements: ["header", "footer"] } })).toEqual([
      "header",
      "footer",
    ]);
  });
});
