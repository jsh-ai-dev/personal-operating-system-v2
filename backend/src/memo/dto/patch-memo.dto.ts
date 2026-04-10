import { PartialType } from "@nestjs/mapped-types";

import { ReplaceMemoDto } from "./replace-memo.dto";

export class PatchMemoDto extends PartialType(ReplaceMemoDto) {}
