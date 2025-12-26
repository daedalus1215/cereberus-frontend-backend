import { Controller, Get, UseGuards } from "@nestjs/common";
import { FetchTagsTransactionScript } from "../../../../domain/transaction-scripts/fetch-tags.transaction.script";
import { TagResponseDto } from "./dtos/responses/tag.response.dto";
import {
  GetAuthUser,
  AuthUser,
} from "src/auth/app/decorators/get-auth-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

@Controller("tags")
@UseGuards(JwtAuthGuard)
export class FetchTagsAction {
  constructor(private readonly fetchTagsTS: FetchTagsTransactionScript) {}

  @Get()
  async apply(@GetAuthUser() user: AuthUser): Promise<TagResponseDto[]> {
    const tags = await this.fetchTagsTS.apply(user.userId);
    return tags.map(
      (tag) => new TagResponseDto({ id: tag.id, name: tag.name }),
    );
  }
}

