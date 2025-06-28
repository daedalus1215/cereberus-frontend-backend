import { DataSource } from "typeorm";
import { User } from "../users/domain/entities/user.entity";
import * as path from "path";
import { Password } from "src/password/domain/entities/password.entity";
import { Tag } from "src/password/domain/entities/tag.entity";

const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.join(__dirname, "../../db.sqlite"),
  entities: [User, Password, Tag],
  migrations: ["src/typeorm/migrations/*.ts"],
  synchronize: false,
  logging: true,
});

export default AppDataSource;
