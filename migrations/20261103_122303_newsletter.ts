import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "newsletter_send" boolean DEFAULT true;
  ALTER TABLE "posts" ADD COLUMN "newsletter_send_test" boolean DEFAULT false;
  ALTER TABLE "posts" ADD COLUMN "newsletter_sent_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "newsletter_broadcast_id" varchar;`)
  await db.execute(sql`
   UPDATE "posts" SET "newsletter_sent_at" = now() WHERE "status" = 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP COLUMN "newsletter_send";
  ALTER TABLE "posts" DROP COLUMN "newsletter_send_test";
  ALTER TABLE "posts" DROP COLUMN "newsletter_sent_at";
  ALTER TABLE "posts" DROP COLUMN "newsletter_broadcast_id";`)
}
