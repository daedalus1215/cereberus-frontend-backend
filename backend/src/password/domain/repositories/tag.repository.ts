import { Tag } from '../entities/tag.entity';

export type TagRepository = {
  findAllByUser(userId: number): Promise<Tag[]>;
  findByIds(ids: number[]): Promise<Tag[]>;
  save(tag: Tag): Promise<Tag>;
}; 