import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class ReplaceChecklistItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsBoolean()
  isChecked?: boolean;
}

export class ReplaceChecklistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplaceChecklistItemDto)
  items!: ReplaceChecklistItemDto[];
}
