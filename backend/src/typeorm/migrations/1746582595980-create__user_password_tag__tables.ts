import { MigrationInterface, QueryRunner } from "typeorm";

export class Create_userPasswordTag_tables1746582595980
  implements MigrationInterface
{
  name = "Create_userPasswordTag_tables1746582595980";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "user_id" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE "passwords" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "created_date" datetime NOT NULL DEFAULT (datetime('now')), "last_modified_date" datetime NOT NULL DEFAULT (datetime('now')), "user_id" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE "password_tags" ("password_id" integer NOT NULL, "tag_id" integer NOT NULL, PRIMARY KEY ("password_id", "tag_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1df5c6dfe06b3faf8a8ad2121c" ON "password_tags" ("password_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_43fb1ea82e61cf4d8980b089b7" ON "password_tags" ("tag_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_1df5c6dfe06b3faf8a8ad2121c"`);
    await queryRunner.query(`DROP INDEX "IDX_43fb1ea82e61cf4d8980b089b7"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_password_tags" ("password_id" integer NOT NULL, "tag_id" integer NOT NULL, CONSTRAINT "FK_1df5c6dfe06b3faf8a8ad2121c9" FOREIGN KEY ("password_id") REFERENCES "passwords" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_43fb1ea82e61cf4d8980b089b7d" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("password_id", "tag_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_password_tags"("password_id", "tag_id") SELECT "password_id", "tag_id" FROM "password_tags"`,
    );
    await queryRunner.query(`DROP TABLE "password_tags"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_password_tags" RENAME TO "password_tags"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1df5c6dfe06b3faf8a8ad2121c" ON "password_tags" ("password_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_43fb1ea82e61cf4d8980b089b7" ON "password_tags" ("tag_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_43fb1ea82e61cf4d8980b089b7"`);
    await queryRunner.query(`DROP INDEX "IDX_1df5c6dfe06b3faf8a8ad2121c"`);
    await queryRunner.query(
      `ALTER TABLE "password_tags" RENAME TO "temporary_password_tags"`,
    );
    await queryRunner.query(
      `CREATE TABLE "password_tags" ("password_id" integer NOT NULL, "tag_id" integer NOT NULL, PRIMARY KEY ("password_id", "tag_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "password_tags"("password_id", "tag_id") SELECT "password_id", "tag_id" FROM "temporary_password_tags"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_password_tags"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_43fb1ea82e61cf4d8980b089b7" ON "password_tags" ("tag_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1df5c6dfe06b3faf8a8ad2121c" ON "password_tags" ("password_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_43fb1ea82e61cf4d8980b089b7"`);
    await queryRunner.query(`DROP INDEX "IDX_1df5c6dfe06b3faf8a8ad2121c"`);
    await queryRunner.query(`DROP TABLE "password_tags"`);
    await queryRunner.query(`DROP TABLE "passwords"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
