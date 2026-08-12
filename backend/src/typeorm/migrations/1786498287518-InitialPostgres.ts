import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialPostgres1786498287518 implements MigrationInterface {
    name = 'InitialPostgres1786498287518'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "username" character varying(20) NOT NULL, "password" character varying(100) NOT NULL, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tags" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "passwords" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "created_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_modified_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "url" character varying, "notes" character varying, CONSTRAINT "PK_c5629066962a085dea3b605e49f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "security_events" ("id" SERIAL NOT NULL, "event_type" character varying(50) NOT NULL, "metadata" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6fc100d6700780737348df0d3ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "password_tags" ("password_id" integer NOT NULL, "tag_id" integer NOT NULL, CONSTRAINT "PK_285b3609327b599be9aa0eec5e9" PRIMARY KEY ("password_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1df5c6dfe06b3faf8a8ad2121c" ON "password_tags" ("password_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_43fb1ea82e61cf4d8980b089b7" ON "password_tags" ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "password_tags" ADD CONSTRAINT "FK_1df5c6dfe06b3faf8a8ad2121c9" FOREIGN KEY ("password_id") REFERENCES "passwords"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "password_tags" ADD CONSTRAINT "FK_43fb1ea82e61cf4d8980b089b7d" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_tags" DROP CONSTRAINT "FK_43fb1ea82e61cf4d8980b089b7d"`);
        await queryRunner.query(`ALTER TABLE "password_tags" DROP CONSTRAINT "FK_1df5c6dfe06b3faf8a8ad2121c9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43fb1ea82e61cf4d8980b089b7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1df5c6dfe06b3faf8a8ad2121c"`);
        await queryRunner.query(`DROP TABLE "password_tags"`);
        await queryRunner.query(`DROP TABLE "security_events"`);
        await queryRunner.query(`DROP TABLE "passwords"`);
        await queryRunner.query(`DROP TABLE "tags"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
