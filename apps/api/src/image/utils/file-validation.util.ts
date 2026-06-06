import { BadRequestException } from "@nestjs/common";
import sharp = require("sharp");

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

export async function validateUploadedImage(file?: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException("Please upload an image file.");
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      "Unsupported file type. Please upload a JPG, PNG, or WebP image."
    );
  }

  try {
    const metadata = await sharp(file.buffer).metadata();
    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error("Missing metadata");
    }
  } catch {
    throw new BadRequestException(
      "The uploaded file is not a valid image or appears to be corrupted."
    );
  }
}
