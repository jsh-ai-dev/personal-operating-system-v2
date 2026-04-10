import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";

import { GetMemosQueryDto } from "./dto/get-memos-query.dto";
import { PatchMemoDto } from "./dto/patch-memo.dto";
import { ReplaceMemoDto } from "./dto/replace-memo.dto";
import { UpsertMemoDto } from "./dto/upsert-memo.dto";
import { MemoService } from "./memo.service";

@Controller("memos")
export class MemoController {
  constructor(private readonly memoService: MemoService) {}

  @Get()
  findByRange(@Query() query: GetMemosQueryDto) {
    return this.memoService.findByRange(query.from, query.to);
  }

  @Get(":dateKey")
  findOne(@Param("dateKey") dateKey: string) {
    return this.memoService.findOne(dateKey);
  }

  /** dateKey를 본문에 넣어 생성·갱신(upsert) */
  @Post()
  upsert(@Body() dto: UpsertMemoDto) {
    return this.memoService.createFromBody(dto.dateKey, dto.brief, dto.detail);
  }

  @Put(":dateKey")
  replace(@Param("dateKey") dateKey: string, @Body() dto: ReplaceMemoDto) {
    return this.memoService.replace(dateKey, dto.brief, dto.detail);
  }

  @Patch(":dateKey")
  patch(@Param("dateKey") dateKey: string, @Body() dto: PatchMemoDto) {
    return this.memoService.patch(dateKey, dto);
  }

  @Delete(":dateKey")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("dateKey") dateKey: string) {
    await this.memoService.remove(dateKey);
  }
}
