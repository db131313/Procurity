import { syncDobData } from "../src/lib/dob/sync";
import { listProjects, getSyncMeta } from "../src/lib/db/store";

async function main() {
  const start = Date.now();
  console.log("nyc sync start days=14");
  const r = await syncDobData(14);
  console.log("done", Date.now() - start, "ms");
  console.log(JSON.stringify(r.counts, null, 2));
  const meta = await getSyncMeta();
  const projects = await listProjects();
  console.log(
    "meta",
    meta,
    "listed",
    projects.length,
    "sample",
    projects[0]?.address,
    projects[0]?.city,
    projects[0]?.score,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
