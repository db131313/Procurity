import { listProjects, upsertUser, getSyncMeta } from "../src/lib/db/store";

async function main() {
  process.env.NETLIFY = "true";
  const projects = await listProjects();
  const user = await upsertUser({
    firebaseUid: "t1",
    email: "t@test.com",
    name: "T",
  });
  const meta = await getSyncMeta();
  console.log("ok", projects.length, user.email, meta.projectCount);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
