/**
 * Build command used by Vercel (package.json "vercel-build").
 *
 * Production deployments: apply pending migrations, then seed — but only if the database is
 * still empty (SEED_ONLY_IF_EMPTY), so admin edits and removed demo data are never undone.
 * Preview / development deployments never touch the database schema.
 */
import { execSync } from "node:child_process";

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
const target = process.env.VERCEL_ENV ?? "local";

if (target === "production") {
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL is not set for the Production environment. Add a Postgres database (Vercel Marketplace) first.");
    process.exit(1);
  }
  console.log("→ Applying database migrations");
  run("npx --no-install prisma migrate deploy");
  console.log("→ Seeding (only if the database is empty)");
  run("npx --no-install tsx prisma/seed.ts", { SEED_ONLY_IF_EMPTY: "true" });
} else {
  console.log(`→ Skipping migrations and seed (VERCEL_ENV=${target})`);
}

run("npx --no-install next build");
