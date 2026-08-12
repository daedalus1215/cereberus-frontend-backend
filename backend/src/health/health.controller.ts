import { Controller, Get } from "@nestjs/common";

// Served at /api/healthz — setGlobalPrefix("api") owns the prefix.
// Deliberately touches nothing: no database, no decryption. It answers "is this process
// serving HTTP", which is what a container health check should ask.
@Controller("healthz")
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }
}
