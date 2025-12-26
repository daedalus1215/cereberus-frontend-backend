import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedTags1766724189766 implements MigrationInterface {
  name = "SeedTags1766724189766";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all users
    const users = await queryRunner.query(`SELECT id FROM "user"`);

    // Tags to seed for each user
    const tagsToSeed = ["Work", "Bills", "Gaming", "Misc"];

    // For each user, create the tags if they don't already exist
    for (const user of users) {
      for (const tagName of tagsToSeed) {
        // Check if tag already exists for this user
        const existingTag = await queryRunner.query(
          `SELECT id FROM "tags" WHERE "name" = ? AND "user_id" = ?`,
          [tagName, user.id],
        );

        // Only insert if tag doesn't exist
        if (existingTag.length === 0) {
          await queryRunner.query(
            `INSERT INTO "tags" ("name", "user_id") VALUES (?, ?)`,
            [tagName, user.id],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get all users
    const users = await queryRunner.query(`SELECT id FROM "user"`);

    // Tags that were seeded
    const seededTags = ["Work", "Bills", "Gaming", "Misc"];

    // For each user, delete the seeded tags
    for (const user of users) {
      for (const tagName of seededTags) {
        await queryRunner.query(
          `DELETE FROM "tags" WHERE "name" = ? AND "user_id" = ?`,
          [tagName, user.id],
        );
      }
    }
  }
}

