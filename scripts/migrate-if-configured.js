/**
 * Runs `prisma migrate deploy` only when DATABASE_URL is set.
 * Lets local/demo builds succeed before Neon credentials arrive.
 */
const { execSync } = require("child_process");

if (!process.env.DATABASE_URL?.trim()) {
  console.log(
    "[db] DATABASE_URL not set — skipping prisma migrate deploy (file store still active).",
  );
  process.exit(0);
}

console.log("[db] Running prisma migrate deploy…");
execSync("npx prisma migrate deploy", { stdio: "inherit" });
