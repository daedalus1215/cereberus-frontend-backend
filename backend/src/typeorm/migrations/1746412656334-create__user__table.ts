import { MigrationInterface, QueryRunner } from "typeorm";

export class Create_user_table1746412656334 implements MigrationInterface {
  name = "Create_user_table1746412656334";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "created_at" text NOT NULL DEFAULT (datetime('now')), "updated_at" text NOT NULL DEFAULT (datetime('now')), "username" varchar(20) NOT NULL, "password" varchar(100) NOT NULL, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
