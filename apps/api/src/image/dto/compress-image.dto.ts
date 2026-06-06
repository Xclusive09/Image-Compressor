import { Transform } from "class-transformer";
import { IsIn, IsNumber, IsOptional, Max, Min } from "class-validator";

export type CompressionMode = "balanced" | "aggressive" | "max";

export class CompressImageDto {
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: "Target size must be a number." })
  @Min(5, { message: "Target size must be at least 5KB." })
  @Max(500, { message: "Target size must be 500KB or less." })
  targetKb!: number;

  @IsOptional()
  @IsIn(["balanced", "aggressive", "max"], {
    message: "Mode must be balanced, aggressive, or max."
  })
  mode?: CompressionMode;
}
