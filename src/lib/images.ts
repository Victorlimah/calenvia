export const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB antes da compressão
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // limite do bucket
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export const MAX_GALLERY_PHOTOS = 12;

export type ImageKind = "logo" | "cover" | "staff" | "gallery";

/** Tamanho máximo (maior lado, em px) por tipo de imagem. */
export const MAX_DIMENSION: Record<ImageKind, number> = {
  logo: 512,
  cover: 1920,
  staff: 640,
  gallery: 1600,
};

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Envie uma foto em JPG, PNG ou WebP.";
  if (file.size > MAX_INPUT_BYTES) return "A foto é muito grande. O limite é 10 MB.";
  return null;
}

/** Redimensiona mantendo a proporção para caber em max × max. */
export function fitWithin(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { width, height };
  const ratio = width >= height ? max / width : max / height;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export function storagePath(businessId: string, kind: ImageKind, ext: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${businessId}/${kind}/${id}.${ext}`;
}

/** Prefixo público das imagens de um negócio no Storage. */
export function mediaPublicPrefix(supabaseUrl: string, businessId: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/business-media/${businessId}/`;
}

/** Comprime no navegador (canvas). Retorna WebP quando suportado, senão JPEG. */
export async function compressImage(
  file: File,
  kind: ImageKind,
): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION[kind]);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob("image/webp", 0.82);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpg = await toBlob("image/jpeg", 0.85);
  if (!jpg) throw new Error("toBlob");
  return { blob: jpg, ext: "jpg" };
}
