import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1624536182699 implements MigrationInterface {
  name = 'InitialSchema1624536182699';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create role enum
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'editor', 'viewer')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'viewer',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // Create documents table
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying,
        "filename" character varying NOT NULL,
        "filepath" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "size" integer NOT NULL,
        "isProcessed" boolean NOT NULL DEFAULT false,
        "uploadedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id")
      )
    `);

    // Create ingestion status enum
    await queryRunner.query(`
      CREATE TYPE "public"."ingestion_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')
    `);

    // Create ingestions table
    await queryRunner.query(`
      CREATE TABLE "ingestions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documentId" uuid NOT NULL,
        "triggeredById" uuid NOT NULL,
        "status" "public"."ingestion_status_enum" NOT NULL DEFAULT 'pending',
        "errorMessage" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_7a81c25e22f5b96a26642b1c9d6" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD CONSTRAINT "FK_documents_uploadedBy_users_id" 
      FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "ingestions" 
      ADD CONSTRAINT "FK_ingestions_documentId_documents_id" 
      FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "ingestions" 
      ADD CONSTRAINT "FK_ingestions_triggeredById_users_id" 
      FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "ingestions" DROP CONSTRAINT "FK_ingestions_triggeredById_users_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "ingestions" DROP CONSTRAINT "FK_ingestions_documentId_documents_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_uploadedBy_users_id"
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE "ingestions"`);
    await queryRunner.query(`DROP TYPE "public"."ingestion_status_enum"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
