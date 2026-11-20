import { describe, expect, it } from "vitest";
import { fitWithin, mediaPublicPrefix, storagePath, validateImageFile } from "./images";

describe("imagens", () => {
  it("valida tipo e tamanho", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "application/pdf", size: 1000 })).toMatch(/JPG/);
    expect(validateImageFile({ type: "image/png", size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
  });
  it("redimensiona mantendo a proporção", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 2000, 500)).toEqual({ width: 250, height: 500 });
    expect(fitWithin(300, 200, 1600)).toEqual({ width: 300, height: 200 });
  });
  it("monta caminho e prefixo", () => {
    expect(storagePath("b1", "logo", "webp")).toMatch(/^b1\/logo\/.+\.webp$/);
    expect(mediaPublicPrefix("http://x/", "b1")).toBe(
      "http://x/storage/v1/object/public/business-media/b1/",
    );
  });

  it("logo: tipos e 2 MB; recorte centralizado e com zoom", async () => {
    const { validateLogoFile, logoCropRect } = await import("./images");
    expect(validateLogoFile({ type: "image/svg+xml", size: 1000 })).toBeNull();
    expect(validateLogoFile({ type: "image/gif", size: 1000 })).toMatch(/PNG, JPG, SVG/);
    expect(validateLogoFile({ type: "image/png", size: 3 * 1024 * 1024 })).toMatch(/2 MB/);
    expect(logoCropRect(1000, 500, 1, 0, 0)).toEqual({ sx: 250, sy: 0, size: 500 });
    expect(logoCropRect(1000, 500, 2, 0, 0)).toEqual({ sx: 375, sy: 125, size: 250 });
    expect(logoCropRect(1000, 500, 1, -1, 0)).toEqual({ sx: 0, sy: 0, size: 500 });
    expect(logoCropRect(1000, 500, 1, 5, 0).sx).toBe(500);
  });
});
