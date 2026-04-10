import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReplaceMemoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  brief?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  detail?: string;
}
