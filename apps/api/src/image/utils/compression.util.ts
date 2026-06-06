import sharp = require("sharp");
import { Sharp } from "sharp";
import { CompressionMode } from "../dto/compress-image.dto";

export interface CompressionModeConfig {
  mode: CompressionMode;
  dimensions: number[];
  minQuality: number;
  maxQuality: number;
}

export interface CompressionResult {
  buffer: Buffer;
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

export class TargetTooSmallError extends Error {
  constructor(
    public readonly targetSizeKb: number,
    public readonly minimumPossibleSizeKb: number
  ) {
    super("TARGET_TOO_SMALL");
  }
}

interface Candidate {
  buffer: Buffer;
  width: number;
  height: number;
  quality: number;
  sizeBytes: number;
  score: number;
}

export function getCompressionModeConfig(
  mode: CompressionMode = "balanced"
): CompressionModeConfig {
  const configs: Record<CompressionMode, CompressionModeConfig> = {
    balanced: {
      mode: "balanced",
      dimensions: [800, 700, 600, 500, 450, 400, 350, 300, 250],
      minQuality: 25,
      maxQuality: 92
    },
    aggressive: {
      mode: "aggressive",
      dimensions: [600, 500, 450, 400, 350, 300, 250, 220, 200],
      minQuality: 15,
      maxQuality: 85
    },
    max: {
      mode: "max",
      dimensions: [500, 450, 400, 350, 300, 250, 220, 200, 180, 160],
      minQuality: 8,
      maxQuality: 80
    }
  };

  return configs[mode];
}

export async function compressToTarget(
  buffer: Buffer,
  targetKb: number,
  config: CompressionModeConfig
): Promise<CompressionResult> {
  const targetBytes = targetKb * 1024;
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width ?? 1;
  const originalHeight = metadata.height ?? 1;
  const candidates: Candidate[] = [];
  let smallestAttempt: Candidate | null = null;

  for (const maxDimension of config.dimensions) {
    const base = createBasePipeline(buffer, maxDimension);
    const bestForDimension = await findBestQuality(
      base,
      targetBytes,
      config.minQuality,
      config.maxQuality,
      originalWidth,
      originalHeight
    );

    if (bestForDimension.underTarget) {
      candidates.push(bestForDimension.candidate);
    }

    if (
      !smallestAttempt ||
      bestForDimension.smallestAttempt.sizeBytes < smallestAttempt.sizeBytes
    ) {
      smallestAttempt = bestForDimension.smallestAttempt;
    }
  }

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best) {
    throw new TargetTooSmallError(
      targetKb,
      roundKb(smallestAttempt?.sizeBytes ?? targetBytes)
    );
  }

  const originalSizeKb = roundKb(buffer.length);
  const compressedSizeKb = roundKb(best.sizeBytes);
  const compressionRatio = Number(
    Math.max(0, ((buffer.length - best.sizeBytes) / buffer.length) * 100).toFixed(1)
  );
  const warning = createWarning(best, targetKb, originalSizeKb);
  const base64 = `data:image/jpeg;base64,${best.buffer.toString("base64")}`;

  return {
    buffer: best.buffer,
    originalSizeKb,
    compressedSizeKb,
    targetSizeKb: targetKb,
    compressionRatio,
    width: best.width,
    height: best.height,
    format: "jpeg",
    quality: best.quality,
    mode: config.mode,
    warning,
    fileName: "compressed-image.jpg",
    mimeType: "image/jpeg",
    base64
  };
}

function createBasePipeline(buffer: Buffer, maxDimension: number): Sharp {
  return sharp(buffer)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true
    });
}

async function findBestQuality(
  base: Sharp,
  targetBytes: number,
  minQuality: number,
  maxQuality: number,
  originalWidth: number,
  originalHeight: number
): Promise<{ underTarget: boolean; candidate: Candidate; smallestAttempt: Candidate }> {
  let low = minQuality;
  let high = maxQuality;
  let bestUnderTarget: Candidate | null = null;
  let smallestAttempt: Candidate | null = null;

  while (low <= high) {
    const quality = Math.floor((low + high) / 2);
    const candidate = await createCandidate(
      base,
      quality,
      targetBytes,
      originalWidth,
      originalHeight
    );

    if (!smallestAttempt || candidate.sizeBytes < smallestAttempt.sizeBytes) {
      smallestAttempt = candidate;
    }

    if (candidate.sizeBytes <= targetBytes) {
      bestUnderTarget = candidate;
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  if (bestUnderTarget) {
    return {
      underTarget: true,
      candidate: bestUnderTarget,
      smallestAttempt: smallestAttempt ?? bestUnderTarget
    };
  }

  const fallback = smallestAttempt ?? (await createCandidate(
    base,
    minQuality,
    targetBytes,
    originalWidth,
    originalHeight
  ));

  return {
    underTarget: false,
    candidate: fallback,
    smallestAttempt: fallback
  };
}

async function createCandidate(
  base: Sharp,
  quality: number,
  targetBytes: number,
  originalWidth: number,
  originalHeight: number
): Promise<Candidate> {
  const { data, info } = await base
    .clone()
    .jpeg({
      quality,
      mozjpeg: true,
      chromaSubsampling: "4:2:0"
    })
    .toBuffer({ resolveWithObject: true });

  const dimensionScore = Math.min(info.width / originalWidth, info.height / originalHeight, 1);
  const qualityScore = quality / 100;
  const sizeEfficiencyScore = Math.min(data.length / targetBytes, 1);
  const lowQualityPenalty = quality < 18 ? 0.08 : 0;
  const tinyDimensionPenalty = info.width < 220 || info.height < 220 ? 0.08 : 0;
  const score =
    dimensionScore * 0.45 +
    qualityScore * 0.4 +
    sizeEfficiencyScore * 0.15 -
    lowQualityPenalty -
    tinyDimensionPenalty;

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    quality,
    sizeBytes: data.length,
    score
  };
}

function createWarning(
  candidate: Candidate,
  targetKb: number,
  originalSizeKb: number
): string | null {
  if (
    candidate.quality < 25 ||
    candidate.width < 250 ||
    candidate.height < 250 ||
    targetKb / originalSizeKb < 0.15
  ) {
    return "To reach this file size, the image had to be heavily compressed. The result may look visibly reduced in quality.";
  }

  return null;
}

function roundKb(bytes: number): number {
  return Number((bytes / 1024).toFixed(1));
}
