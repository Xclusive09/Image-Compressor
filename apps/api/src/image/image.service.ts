import { BadRequestException, Injectable } from "@nestjs/common";
import { CompressionMode } from "./dto/compress-image.dto";
import {
  compressToTarget,
  getCompressionModeConfig,
  TargetTooSmallError
} from "./utils/compression.util";
import { validateUploadedImage } from "./utils/file-validation.util";

@Injectable()
export class ImageService {
  async compressImage(
    file: Express.Multer.File,
    targetKb: number,
    mode: CompressionMode = "balanced"
  ) {
    this.validateTarget(targetKb);
    await this.validateImage(file);

    const requestedConfig = this.getCompressionModeConfig(mode);

    try {
      const result = await this.compressToTarget(file.buffer, targetKb, requestedConfig);
      const { buffer: _buffer, ...data } = result;

      return {
        success: true,
        message: "Image compressed successfully.",
        data
      };
    } catch (error) {
      if (error instanceof TargetTooSmallError && mode !== "max") {
        try {
          const fallback = await this.compressToTarget(
            file.buffer,
            targetKb,
            this.getCompressionModeConfig("max")
          );
          const { buffer: _buffer, ...data } = fallback;
          return {
            success: true,
            message: "Image compressed successfully.",
            data
          };
        } catch (fallbackError) {
          if (fallbackError instanceof TargetTooSmallError) {
            return this.targetTooSmallResponse(fallbackError);
          }
        }
      }

      if (error instanceof TargetTooSmallError) {
        return this.targetTooSmallResponse(error);
      }

      throw error;
    }
  }

  async validateImage(file: Express.Multer.File) {
    await validateUploadedImage(file);
  }

  getCompressionModeConfig(mode: CompressionMode = "balanced") {
    return getCompressionModeConfig(mode);
  }

  async compressToTarget(
    buffer: Buffer,
    targetKb: number,
    config = this.getCompressionModeConfig("balanced")
  ) {
    return compressToTarget(buffer, targetKb, config);
  }

  private validateTarget(targetKb: number) {
    if (!Number.isFinite(targetKb) || targetKb < 5 || targetKb > 500) {
      throw new BadRequestException("Target size must be between 5KB and 500KB.");
    }
  }

  private targetTooSmallResponse(error: TargetTooSmallError) {
    return {
      success: false,
      message:
        "This image cannot be compressed to the selected target size without becoming too poor in quality. Try a higher target size or use aggressive mode.",
      error: {
        code: "TARGET_TOO_SMALL",
        targetSizeKb: error.targetSizeKb,
        minimumPossibleSizeKb: error.minimumPossibleSizeKb
      }
    };
  }
}
