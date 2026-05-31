import { IsString, MaxLength, Matches } from "class-validator";

export class RecordPageViewDto {
  @IsString()
  @MaxLength(512)
  @Matches(/^\/[^\s]*$/)
  path!: string;
}
