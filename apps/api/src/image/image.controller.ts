import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CompressImageDto } from "./dto/compress-image.dto";
import { ImageService } from "./image.service";

@Controller("images")
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post("compress")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024
      }
    })
  )
  compressImage(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: CompressImageDto
  ) {
    return this.imageService.compressImage(image, dto.targetKb, dto.mode ?? "balanced");
  }
}
