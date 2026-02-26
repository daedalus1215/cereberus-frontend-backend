import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SecurityEvent } from "./domain/entities/security-event.entity";
import { SecurityEventRepository } from "./infra/repositories/security-event.repository";
import { SecurityEventAggregator } from "./domain/aggregators/security-event.aggregator";

@Module({
  imports: [TypeOrmModule.forFeature([SecurityEvent])],
  providers: [SecurityEventRepository, SecurityEventAggregator],
  exports: [SecurityEventAggregator],
})
export class SecurityEventsModule {}
