import { Injectable } from "@nestjs/common";
import { TagRepositoryImpl } from "../../infra/repositories/tag.repository.impl";
import { Tag } from "../entities/tag.entity";

@Injectable()
export class FetchTagsTransactionScript {
  constructor(private readonly tagRepo: TagRepositoryImpl) {}

  async apply(userId: string): Promise<Tag[]> {
    return this.tagRepo.findAllByUser(userId);
  }
}

