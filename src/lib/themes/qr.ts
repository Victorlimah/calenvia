/**
 * Cor do QR code no tema (CAL-150). O leitor precisa de muito contraste com o fundo branco:
 * usa a cor principal só se ela for bem escura (≥ 7:1); senão, o texto do tema; senão, tinta.
 */
import { contrastRatio, WHITE } from "./color";
import type { ResolvedTheme } from "./resolve";

export const QR_MIN_CONTRAST = 7;
export const QR_FALLBACK = "#14161A";

export function qrColor(r: ResolvedTheme): string {
  for (const c of [r.colors.primary, r.colors.text]) {
    if (contrastRatio(c, WHITE) >= QR_MIN_CONTRAST) return c;
  }
  return QR_FALLBACK;
}
