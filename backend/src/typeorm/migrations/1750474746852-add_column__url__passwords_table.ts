import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnUrlPasswordsTable1750474746852
  implements MigrationInterface
{
  name = "AddColumnUrlPasswordsTable1750474746852";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_passwords" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "created_date" datetime NOT NULL DEFAULT (datetime('now')), "last_modified_date" datetime NOT NULL DEFAULT (datetime('now')), "user_id" integer NOT NULL, "url" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_passwords"("id", "name", "username", "password", "created_date", "last_modified_date", "user_id") SELECT "id", "name", "username", "password", "created_date", "last_modified_date", "user_id" FROM "passwords"`,
    );
    await queryRunner.query(`DROP TABLE "passwords"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_passwords" RENAME TO "passwords"`,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_passwords" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "created_date" datetime NOT NULL DEFAULT (datetime('now')), "last_modified_date" datetime NOT NULL DEFAULT (datetime('now')), "user_id" varchar NOT NULL, "url" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_passwords"("id", "name", "username", "password", "created_date", "last_modified_date", "user_id", "url") SELECT "id", "name", "username", "password", "created_date", "last_modified_date", "user_id", "url" FROM "passwords"`,
    );
    await queryRunner.query(`DROP TABLE "passwords"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_passwords" RENAME TO "passwords"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "passwords" RENAME TO "temporary_passwords"`,
    );
    await queryRunner.query(
      `CREATE TABLE "passwords" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "created_date" datetime NOT NULL DEFAULT (datetime('now')), "last_modified_date" datetime NOT NULL DEFAULT (datetime('now')), "user_id" integer NOT NULL, "url" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "passwords"("id", "name", "username", "password", "created_date", "last_modified_date", "user_id", "url") SELECT "id", "name", "username", "password", "created_date", "last_modified_date", "user_id", "url" FROM "temporary_passwords"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_passwords"`);
    await queryRunner.query(
      `ALTER TABLE "passwords" RENAME TO "temporary_passwords"`,
    );
    await queryRunner.query(
      `CREATE TABLE "passwords" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "created_date" datetime NOT NULL DEFAULT (datetime('now')), "last_modified_date" datetime NOT NULL DEFAULT (datetime('now')), "user_id" integer NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "passwords"("id", "name", "username", "password", "created_date", "last_modified_date", "user_id") SELECT "id", "name", "username", "password", "created_date", "last_modified_date", "user_id" FROM "temporary_passwords"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_passwords"`);
  }
}
