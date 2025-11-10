import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Password } from "../../domain/entities/password.entity";

@Injectable()
export class PasswordRepositoryImpl {
  constructor(
    @InjectRepository(Password)
    private readonly repo: Repository<Password>,
  ) {}

  async findAllByUser(userId: string): Promise<Password[]> {
    return this.repo.find({ where: { userId: userId }, relations: ["tags"] });
  }

  async findByIdAndUser(id: number, userId: string): Promise<Password | null> {
    return this.repo.findOne({
      where: { id, userId: userId },
      relations: ["tags"],
    });
  }

  async save(password: Password): Promise<Password> {
    return this.repo.save(password);
  }

  async update(password: Password): Promise<Password> {
    return this.repo.save(password);
  }
}
