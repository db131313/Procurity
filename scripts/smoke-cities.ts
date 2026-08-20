import {
  fetchBostonCkanRows,
  fetchSocrataRows,
  mapBostonRow,
  mapChicagoRow,
  mapLaRow,
} from "../src/lib/cities/fetch";
import { buildScoredProjects } from "../src/lib/cities/score-permits";

async function main() {
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

  const chiRows = await fetchSocrataRows(
    "https://data.cityofchicago.org/resource/ydr8-5enu.json",
    {
      $order: "issue_date DESC",
      $where: `latitude IS NOT NULL AND longitude IS NOT NULL AND issue_date >= '${since}'`,
    },
    { limit: 50 },
  );
  const chiPermits = chiRows
    .map(mapChicagoRow)
    .filter((p): p is NonNullable<typeof p> => p != null);
  const chi = buildScoredProjects("chicago", chiPermits);
  console.log(
    "chicago",
    chiRows.length,
    "rows ->",
    chi.length,
    "projects",
    chi[0]?.score,
    chi[0]?.phase,
    chi[0]?.address,
  );

  const laRows = await fetchSocrataRows(
    "https://data.lacity.org/resource/xnhu-aczu.json",
    {
      $order: "issue_date DESC",
      $where: "location_1 IS NOT NULL",
    },
    { limit: 40 },
  );
  const laPermits = laRows
    .map(mapLaRow)
    .filter((p): p is NonNullable<typeof p> => p != null);
  const la = buildScoredProjects("los_angeles", laPermits);
  console.log(
    "la",
    laRows.length,
    "rows ->",
    la.length,
    "projects",
    la[0]?.score,
    la[0]?.phase,
  );

  const bosRows = await fetchBostonCkanRows(40);
  const bosPermits = bosRows
    .map(mapBostonRow)
    .filter((p): p is NonNullable<typeof p> => p != null);
  const bos = buildScoredProjects("boston", bosPermits);
  console.log(
    "boston",
    bosRows.length,
    "rows ->",
    bos.length,
    "projects",
    bos[0]?.score,
    bos[0]?.phase,
    bos[0]?.address,
  );

  try {
    const mia = await fetchSocrataRows(
      "https://data.miamigov.com/resource/7ey5-m434.json",
      {},
      { limit: 5 },
    );
    console.log("miami rows", mia.length);
  } catch (e) {
    console.log(
      "miami FLAG unreachable",
      e instanceof Error ? e.message : e,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
