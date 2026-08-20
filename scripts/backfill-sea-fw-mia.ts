/**
 * Backfill Seattle / Fort Worth / Miami-Dade and report project counts by city.
 */
import { seattleSource } from "../src/lib/sources/seattle";
import { fortWorthSource } from "../src/lib/sources/fort-worth";
import { miamiDadeSource } from "../src/lib/sources/miami-dade";
import { listProjects, getSyncMeta } from "../src/lib/db/store";

async function main() {
  const days = Number(process.env.BACKFILL_DAYS || "90");
  console.log("backfill days", days);

  const sea = await seattleSource.fetchProjects({ days });
  console.log("seattle fetched", sea.length, "sample", sea[0]?.address, sea[0]?.score, sea[0]?.estimatedJobCost);

  const fw = await fortWorthSource.fetchProjects({ days });
  console.log("fort_worth fetched", fw.length, "sample", fw[0]?.address, fw[0]?.score, fw[0]?.estimatedJobCost);

  const mia = await miamiDadeSource.fetchProjects({ days });
  console.log(
    "miami_dade fetched",
    mia.length,
    "sample",
    mia[0]?.address,
    mia[0]?.score,
    "cost",
    mia[0]?.estimatedJobCost,
    "reasons",
    mia[0]?.scoreReasons?.[0],
  );

  const projects = await listProjects();
  const byCity: Record<string, number> = {};
  for (const p of projects) {
    byCity[p.city] = (byCity[p.city] ?? 0) + 1;
  }
  console.log("byCity", byCity);
  console.log("meta", await getSyncMeta());

  // Sanity: Miami scores should not be NaN / zero-value display break
  const miaBad = mia.filter(
    (p) => !Number.isFinite(p.score) || p.score < 0 || p.score > 100,
  );
  console.log("miami_dade invalid scores", miaBad.length);
  const miaWithCost = mia.filter((p) => p.estimatedJobCost != null).length;
  console.log("miami_dade with cost (expect 0)", miaWithCost);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
