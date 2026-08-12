import "dotenv/config";
import { DataSource } from "typeorm";
import { User } from "../users/domain/entities/user.entity";
import { Password } from "src/password/domain/entities/password.entity";
import { Tag } from "src/password/domain/entities/tag.entity";
import { SecurityEvent } from "src/security-events/domain/entities/security-event.entity";

// Used by the TypeORM CLI only; the running app builds its own connection in app.module.ts.
// Both must describe the same database or generated migrations won't match production.
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Password, Tag, SecurityEvent],
  migrations: ["src/typeorm/migrations/*.ts"],
  synchronize: false,
  logging: true,
});

export default AppDataSource;
