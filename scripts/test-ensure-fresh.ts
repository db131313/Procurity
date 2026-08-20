import { ensureMapDataFresh } from "../src/lib/map/ensure-fresh";
import { listProjects, getSyncMeta } from "../src/lib/db/store";

async function main() {
  const r = await ensureMapDataFresh();
  console.log("ensure", JSON.stringify(r, null, 2));
  const projects = await listProjects();
  const byCity: Record<string, number> = {};
  for (const p of projects) byCity[p.city] = (byCity[p.city] ?? 0) + 1;
  console.log("byCity", byCity);
  console.log("meta", await getSyncMeta());
  for (const c of [
    "san_francisco",
    "chicago",
    "los_angeles",
    "boston",
  ] as const) {
    const s = projects.find((p) => p.city === c);
    console.log(
      c,
      s ? `${s.score} ${s.phase} ${s.address}` : "MISSING",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
