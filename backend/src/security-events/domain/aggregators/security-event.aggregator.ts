import { Injectable } from "@nestjs/common";
import { SecurityEventRepository } from "../../infra/repositories/security-event.repository";

export type FailedLoginContext = {
  username: string;
  ip?: string;
  userAgent?: string;
};

export type DisabledRegistrationContext = {
  ip?: string;
  userAgent?: string;
};

/**
 * Aggregator for security event logging.
 * Exposes cross-domain API for auth and users modules.
 */
@Injectable()
export class SecurityEventAggregator {
  constructor(
    private readonly securityEventRepository: SecurityEventRepository,
  ) {}

  async logFailedLogin(context: FailedLoginContext): Promise<void> {
    await this.securityEventRepository.create("failed_login", {
      username: context.username,
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }

  async logDisabledRegistrationAttempt(
    context: DisabledRegistrationContext,
  ): Promise<void> {
    await this.securityEventRepository.create(
      "disabled_registration_attempt",
      {
        ip: context.ip,
        userAgent: context.userAgent,
      },
    );
  }
}
