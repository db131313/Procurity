import {
  fetchArcGisFeatures,
  fetchBostonCkanRows,
  fetchSocrataRows,
  mapBostonRow,
  mapChicagoRow,
  mapFortWorthFeature,
  mapLaRow,
  mapMiamiDadeFeature,
  mapSanFranciscoRow,
  mapSeattleRow,
  arcGisDateLiteral,
} from "../src/lib/cities/fetch";
import { buildScoredProjects } from "../src/lib/cities/score-permits";

async function main() {
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const arcSince = arcGisDateLiteral(90);

  const chiRows = await fetchSocrataRows(
    "https://data.cityofchicago.org/resource/ydr8-5enu.json",
    {
      $order: "issue_date DESC",
      $where: `latitude IS NOT NULL AND longitude IS NOT NULL AND issue_date >= '${since}'`,
    },
    { limit: 50 },
  );
  const chi = buildScoredProjects(
    "chicago",
    chiRows.map(mapChicagoRow).filter((p): p is NonNullable<typeof p> => p != null),
  );
  console.log("chicago", chiRows.length, "->", chi.length, chi[0]?.address);

  const laRows = await fetchSocrataRows(
    "https://data.lacity.org/resource/xnhu-aczu.json",
    { $order: "issue_date DESC", $where: "location_1 IS NOT NULL" },
    { limit: 40 },
  );
  const la = buildScoredProjects(
    "los_angeles",
    laRows.map(mapLaRow).filter((p): p is NonNullable<typeof p> => p != null),
  );
  console.log("la", laRows.length, "->", la.length);

  const bosRows = await fetchBostonCkanRows(40);
  const bos = buildScoredProjects(
    "boston",
    bosRows.map(mapBostonRow).filter((p): p is NonNullable<typeof p> => p != null),
  );
  console.log("boston", bosRows.length, "->", bos.length, bos[0]?.address);

  const sfRows = await fetchSocrataRows(
    "https://data.sfgov.org/resource/p4e4-a5a7.json",
    {
      $order: "filed_date DESC",
      $where: `location IS NOT NULL AND filed_date >= '${since}'`,
    },
    { limit: 50 },
  );
  const sf = buildScoredProjects(
    "san_francisco",
    sfRows
      .map(mapSanFranciscoRow)
      .filter((p): p is NonNullable<typeof p> => p != null),
  );
  console.log("san_francisco", sfRows.length, "->", sf.length, sf[0]?.address);

  const seaRows = await fetchSocrataRows(
    "https://data.seattle.gov/resource/76t5-zqzr.json",
    {
      $order: "issueddate DESC",
      $where: `latitude IS NOT NULL AND issueddate >= '${since}'`,
    },
    { limit: 50 },
  );
  const sea = buildScoredProjects(
    "seattle",
    seaRows.map(mapSeattleRow).filter((p): p is NonNullable<typeof p> => p != null),
  );
  console.log(
    "seattle",
    seaRows.length,
    "->",
    sea.length,
    sea[0]?.address,
    sea[0]?.estimatedJobCost,
  );

  const fwFeats = await fetchArcGisFeatures(
    "https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/Permits/MapServer/0",
    {
      where: `Latitude IS NOT NULL AND JobValue > 0 AND File_Date >= ${arcSince}`,
      orderByFields: "File_Date DESC",
    },
    { limit: 40 },
  );
  const fw = buildScoredProjects(
    "fort_worth",
    fwFeats
      .map(mapFortWorthFeature)
      .filter((p): p is NonNullable<typeof p> => p != null),
  );
  console.log(
    "fort_worth",
    fwFeats.length,
    "->",
    fw.length,
    fw[0]?.address,
    fw[0]?.estimatedJobCost,
  );

  const miaFeats = await fetchArcGisFeatures(
    "https://gisweb.miamidade.gov/arcgis/rest/services/MD_LandInformation/MapServer/1",
    { where: `ISSUDATE >= ${arcSince}`, orderByFields: "ISSUDATE DESC" },
    { limit: 40 },
  );
  const mia = buildScoredProjects(
    "miami_dade",
    miaFeats
      .map(mapMiamiDadeFeature)
      .filter((p): p is NonNullable<typeof p> => p != null),
  );
  console.log(
    "miami_dade",
    miaFeats.length,
    "->",
    mia.length,
    mia[0]?.address,
    "cost",
    mia[0]?.estimatedJobCost,
    mia[0]?.score,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
