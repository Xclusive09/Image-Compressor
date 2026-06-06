import sharp = require("sharp");
import { randomFillSync } from "crypto";
import { ImageService } from "./image.service";
import { TargetTooSmallError } from "./utils/compression.util";

jest.setTimeout(30000);

function makeFile(buffer: Buffer, mimetype = "image/jpeg"): Express.Multer.File {
  return {
    fieldname: "image",
    originalname: "test-image.jpg",
    encoding: "7bit",
    mimetype,
    size: buffer.length,
    buffer,
    destination: "",
    filename: "",
    path: "",
    stream: undefined as never
  };
}

async function createJpegFixture(width = 800, height = 800) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 180, g: 120, b: 90 }
    }
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function createPngFixture() {
  return sharp({
    create: {
      width: 700,
      height: 600,
      channels: 3,
      background: { r: 80, g: 130, b: 190 }
    }
  })
    .png()
    .toBuffer();
}

async function createNoisyFixture() {
  const width = 1200;
  const height = 1200;
  const raw = Buffer.alloc(width * height * 3);
  randomFillSync(raw);

  return sharp(raw, {
    raw: {
      width,
      height,
      channels: 3
    }
  })
    .jpeg({ quality: 100 })
    .toBuffer();
}

describe("ImageService", () => {
  let service: ImageService;

  beforeEach(() => {
    service = new ImageService();
  });

  it("rejects invalid target size below 5KB", async () => {
    const buffer = await createJpegFixture();

    await expect(
      service.compressImage(makeFile(buffer), 4, "balanced")
    ).rejects.toThrow("Target size must be between 5KB and 500KB.");
  });

  it("rejects invalid file type", async () => {
    const buffer = Buffer.from("plain text");

    await expect(
      service.compressImage(makeFile(buffer, "text/plain"), 12, "balanced")
    ).rejects.toThrow("Unsupported file type");
  });

  it("compresses a valid JPEG below target size", async () => {
    const buffer = await createJpegFixture();
    const result = await service.compressImage(makeFile(buffer), 12, "balanced");

    expect(result.success).toBe(true);
    if (!("data" in result)) {
      throw new Error("Expected successful compression data.");
    }
    expect(result.data.compressedSizeKb).toBeLessThanOrEqual(12);
    expect(result.data.mimeType).toBe("image/jpeg");
  });

  it("compresses a PNG input and returns JPEG output", async () => {
    const buffer = await createPngFixture();
    const result = await service.compressImage(makeFile(buffer, "image/png"), 15, "balanced");

    expect(result.success).toBe(true);
    if (!("data" in result)) {
      throw new Error("Expected successful compression data.");
    }
    expect(result.data.format).toBe("jpeg");
    expect(result.data.base64.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("returns TARGET_TOO_SMALL when target is impossible", async () => {
    const buffer = await createNoisyFixture();

    await expect(
      service.compressToTarget(buffer, 5, {
        mode: "max",
        dimensions: [1200],
        minQuality: 80,
        maxQuality: 80
      })
    ).rejects.toBeInstanceOf(TargetTooSmallError);
  });

  it("returns useful metadata", async () => {
    const buffer = await createJpegFixture();
    const result = await service.compressImage(makeFile(buffer), 20, "aggressive");

    expect(result.success).toBe(true);
    if (!("data" in result)) {
      throw new Error("Expected successful compression data.");
    }
    expect(result.data.originalSizeKb).toBeGreaterThan(0);
    expect(result.data.compressedSizeKb).toBeGreaterThan(0);
    expect(result.data.width).toBeGreaterThan(0);
    expect(result.data.height).toBeGreaterThan(0);
    expect(result.data.quality).toBeGreaterThan(0);
    expect(result.data.format).toBe("jpeg");
  });
});
