import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Tag } from "../../domain/entities/tag.entity";

@Injectable()
export class TagRepositoryImpl {
  constructor(
    @InjectRepository(Tag)
    private readonly repo: Repository<Tag>,
  ) {}

  async findAllByUser(userId: string): Promise<Tag[]> {
    return this.repo.find({
      where: { user_id: parseInt(userId, 10) },
      relations: ["passwords"],
    });
  }

  async findByIds(ids: number[], userId: string): Promise<Tag[]> {
    return this.repo.find({
      where: { id: In(ids), user_id: parseInt(userId, 10) },
      relations: ["passwords"],
    });
  }

  async findByIdsAndUser(ids: number[], userId: string): Promise<Tag[]> {
    return this.findByIds(ids, userId);
  }

  async save(tag: Tag): Promise<Tag> {
    return this.repo.save(tag);
  }

  async findByNameAndUser(name: string, userId: string): Promise<Tag | null> {
    return this.repo.findOne({
      where: { name, user_id: parseInt(userId, 10) },
    });
  }
}
