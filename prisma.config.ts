import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use a direct (non-pooled) connection when one is provided — e.g. Neon's
    // DATABASE_URL_UNPOOLED, which the Neon integration on Vercel sets. The app uses DATABASE_URL.
    // `prisma generate` needs no database, so a missing URL doesn't fail installs/builds.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || undefined,
  },
});
