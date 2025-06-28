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

  async findAllByUser(userId: number): Promise<Tag[]> {
    return this.repo.find({
      where: { user_id: userId },
      relations: ["passwords"],
    });
  }

  async findByIds(ids: number[]): Promise<Tag[]> {
    return this.repo.find({ where: { id: In(ids) }, relations: ["passwords"] });
  }

  async save(tag: Tag): Promise<Tag> {
    return this.repo.save(tag);
  }
}
