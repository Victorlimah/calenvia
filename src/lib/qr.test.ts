import { describe, expect, it } from "vitest";
import { qrMatrix, qrSvgPath } from "./qr";

// Saída do `qrencode -l M -8 -m 0 -t ASCII` (1 = escuro) para o mesmo texto.
const QRENCODE = [
  "11111110111011000011101111111",
  "10000010101001001110101000001",
  "10111010000111000010001011101",
  "10111010110101100111101011101",
  "10111010011000111001001011101",
  "10000010011110000111101000001",
  "11111110101010101010101111111",
  "00000000111010111100000000000",
  "10110111000100111110001001011",
  "11110000110000101011011110001",
  "11111111011101101000010110110",
  "10111000011001011010111000001",
  "00000110101110010101000001100",
  "01101000010011111101001000111",
  "10001010111010101001001010111",
  "00000101101101001000100010010",
  "11110111100110010010110011010",
  "00010101001011011100110101110",
  "10011010110010011000110110100",
  "00010100111110000100001100100",
  "01011110110101001110111111100",
  "00000000111011101010100011111",
  "11111110111011001111101011010",
  "10000010100010001011100011010",
  "10111010000000100100111110100",
  "10111010100101111001110111001",
  "10111010100111001111000100101",
  "10000010000011101010111001010",
  "11111110111111101011110100010",
];

describe("QR code (CAL-118)", () => {
  it("bate módulo a módulo com o qrencode (alguma das 8 máscaras)", () => {
    const expected = QRENCODE.map((r) => [...r].map((c) => c === "1"));
    const same = [0, 1, 2, 3, 4, 5, 6, 7].filter(
      (mask) =>
        JSON.stringify(qrMatrix("https://barbearia-do-ze.calenvia.com.br", { mask })) ===
        JSON.stringify(expected),
    );
    expect(same).toHaveLength(1);
  });

  it("escolhe a menor versão que cabe e recusa texto grande demais", () => {
    expect(qrMatrix("a")).toHaveLength(21);
    expect(qrMatrix("https://barbearia-do-ze.calenvia.com.br")).toHaveLength(QRENCODE.length);
    expect(() => qrMatrix("x".repeat(300))).toThrow();
  });

  it("gera o caminho SVG com margem", () => {
    const { path, size } = qrSvgPath(qrMatrix("a"));
    expect(size).toBe(29);
    expect(path.startsWith("M4,4h1v1h-1z")).toBe(true);
  });
});
