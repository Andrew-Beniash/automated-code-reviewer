export default class CreateInitialTables1704988800000 {
  name = 'CreateInitialTables1704988800000';

  async up(queryRunner) {
    try {
      // Enable UUID extension if not already enabled
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

      // Create enum types
      await queryRunner.query(`
                DO $$ BEGIN
                    CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'user', 'guest');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

      await queryRunner.query(`
                DO $$ BEGIN
                    CREATE TYPE "public"."vcs_provider_enum" AS ENUM('github', 'gitlab', 'bitbucket');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

      await queryRunner.query(`
                DO $$ BEGIN
                    CREATE TYPE "public"."review_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'failed');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

      await queryRunner.query(`
                DO $$ BEGIN
                    CREATE TYPE "public"."finding_severity_enum" AS ENUM('info', 'warning', 'error', 'critical');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

      await queryRunner.query(`
                DO $$ BEGIN
                    CREATE TYPE "public"."rule_category_enum" AS ENUM('code_style', 'security', 'performance', 'maintainability', 'bug_risk');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

      // Create users table - Core table for user management
      await queryRunner.query(`
                CREATE TABLE "users" (
                    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(100) NOT NULL,
                    "email" VARCHAR(255) NOT NULL UNIQUE,
                    "password_hash" VARCHAR(255) NOT NULL,
                    "role" "public"."user_role_enum" NOT NULL DEFAULT 'user',
                    "github_id" VARCHAR(255),
                    "avatar_url" VARCHAR(255),
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "pk_users" PRIMARY KEY ("id")
                )
            `);

      // Create repositories table - Stores information about code repositories
      await queryRunner.query(`
                CREATE TABLE "repositories" (
                    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(255) NOT NULL,
                    "url" VARCHAR(255) NOT NULL,
                    "vcs_provider" "public"."vcs_provider_enum" NOT NULL DEFAULT 'github',
                    "description" VARCHAR(255),
                    "default_branch" VARCHAR(100) NOT NULL DEFAULT 'main',
                    "is_private" BOOLEAN NOT NULL DEFAULT false,
                    "is_active" BOOLEAN NOT NULL DEFAULT true,
                    "owner_id" UUID NOT NULL,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "pk_repositories" PRIMARY KEY ("id"),
                    CONSTRAINT "fk_repositories_owner" FOREIGN KEY ("owner_id") 
                        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
                )
            `);

      // Create rules table - Stores code analysis rules
      await queryRunner.query(`
                CREATE TABLE "rules" (
                    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(255) NOT NULL,
                    "description" TEXT NOT NULL,
                    "category" "public"."rule_category_enum" NOT NULL,
                    "severity" "public"."finding_severity_enum" NOT NULL DEFAULT 'warning',
                    "pattern" JSONB,
                    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
                    "is_custom" BOOLEAN NOT NULL DEFAULT false,
                    "created_by" UUID,
                    "configuration" JSONB,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "pk_rules" PRIMARY KEY ("id"),
                    CONSTRAINT "fk_rules_created_by" FOREIGN KEY ("created_by") 
                        REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
                )
            `);

      // Create code_reviews table - Stores individual code review sessions
      await queryRunner.query(`
                CREATE TABLE "code_reviews" (
                    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "commit_id" VARCHAR(255) NOT NULL,
                    "branch" VARCHAR(255) NOT NULL,
                    "status" "public"."review_status_enum" NOT NULL DEFAULT 'pending',
                    "metadata" JSONB,
                    "repository_id" UUID NOT NULL,
                    "triggered_by" UUID NOT NULL,
                    "started_at" TIMESTAMP,
                    "completed_at" TIMESTAMP,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "pk_code_reviews" PRIMARY KEY ("id"),
                    CONSTRAINT "fk_code_reviews_repository" FOREIGN KEY ("repository_id") 
                        REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT "fk_code_reviews_triggered_by" FOREIGN KEY ("triggered_by") 
                        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
                )
            `);

      // Create review_findings table - Stores individual issues found during code review
      await queryRunner.query(`
                CREATE TABLE "review_findings" (
                    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "review_id" UUID NOT NULL,
                    "rule_id" UUID NOT NULL,
                    "file_path" VARCHAR(255) NOT NULL,
                    "line_number" INTEGER NOT NULL,
                    "column_start" INTEGER,
                    "column_end" INTEGER,
                    "severity" "public"."finding_severity_enum" NOT NULL DEFAULT 'info',
                    "message" TEXT NOT NULL,
                    "snippet" TEXT,
                    "suggested_fix" TEXT,
                    "metadata" JSONB,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "pk_review_findings" PRIMARY KEY ("id"),
                    CONSTRAINT "fk_review_findings_review" FOREIGN KEY ("review_id") 
                        REFERENCES "code_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT "fk_review_findings_rule" FOREIGN KEY ("rule_id") 
                        REFERENCES "rules"("id") ON DELETE CASCADE ON UPDATE CASCADE
                )
            `);

      // Create indexes for better query performance
      await queryRunner.query(
        `CREATE INDEX "idx_repositories_owner" ON "repositories"("owner_id")`
      );
      await queryRunner.query(
        `CREATE INDEX "idx_code_reviews_repository" ON "code_reviews"("repository_id")`
      );
      await queryRunner.query(
        `CREATE INDEX "idx_code_reviews_triggered_by" ON "code_reviews"("triggered_by")`
      );
      await queryRunner.query(
        `CREATE INDEX "idx_review_findings_review" ON "review_findings"("review_id")`
      );
      await queryRunner.query(
        `CREATE INDEX "idx_review_findings_rule" ON "review_findings"("rule_id")`
      );
      await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users"("email")`);
      await queryRunner.query(`CREATE INDEX "idx_users_github_id" ON "users"("github_id")`);
    } catch (error) {
      console.error('Migration up failed:', error);
      throw error;
    }
  }

  async down(queryRunner) {
    try {
      // Drop indexes first
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_github_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_findings_rule"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_findings_review"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_code_reviews_triggered_by"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_code_reviews_repository"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_repositories_owner"`);

      // Drop tables in correct order (respect foreign key constraints)
      await queryRunner.query(`DROP TABLE IF EXISTS "review_findings"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "code_reviews"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "rules"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "repositories"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

      // Drop enum types
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."finding_severity_enum"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."review_status_enum"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."vcs_provider_enum"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role_enum"`);
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."rule_category_enum"`);
    } catch (error) {
      console.error('Migration down failed:', error);
      throw error;
    }
  }
}
