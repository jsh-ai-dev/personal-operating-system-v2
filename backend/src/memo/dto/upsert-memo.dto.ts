import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpsertMemoDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  brief?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  detail?: string;
}
