export type CompressionMode = "balanced" | "aggressive" | "max";

export interface CompressionData {
  originalSizeKb: number;
  compressedSizeKb: number;
  targetSizeKb: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: "jpeg";
  quality: number;
  mode: CompressionMode;
  warning: string | null;
  fileName: string;
  mimeType: "image/jpeg";
  base64: string;
}

export interface CompressionSuccess {
  success: true;
  message: string;
  data: CompressionData;
}

export interface CompressionFailure {
  success: false;
  message: string;
  error?: {
    code?: string;
    targetSizeKb?: number;
    minimumPossibleSizeKb?: number;
  };
}

export type CompressionResponse = CompressionSuccess | CompressionFailure;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function compressImage(
  image: File,
  targetKb: number,
  mode: CompressionMode
): Promise<CompressionResponse> {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("targetKb", String(targetKb));
  formData.append("mode", mode);

  const response = await fetch(`${API_URL}/api/images/compress`, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json()) as CompressionResponse;
  if (!response.ok && payload?.message) {
    return payload;
  }

  return payload;
}

export function formatKb(value: number) {
  return `${value.toFixed(1)}KB`;
}
