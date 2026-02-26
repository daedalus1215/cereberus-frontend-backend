import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SecurityEvent,
  SecurityEventType,
} from "../../domain/entities/security-event.entity";

@Injectable()
export class SecurityEventRepository {
  constructor(
    @InjectRepository(SecurityEvent)
    private readonly repository: Repository<SecurityEvent>,
  ) {}

  async create(
    eventType: SecurityEventType,
    metadata: Record<string, unknown>,
  ): Promise<SecurityEvent> {
    const event = this.repository.create({
      eventType,
      metadata: JSON.stringify(metadata),
    });
    return this.repository.save(event);
  }
}
