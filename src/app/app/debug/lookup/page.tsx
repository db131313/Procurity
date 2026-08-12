import Link from "next/link";
import { redirect } from "next/navigation";
import { listProjects } from "@/lib/db/store";
import { readDiscards } from "@/lib/dob/discards";

/**
 * Internal QA tool — search ingested projects / discard log by address or BIN.
 */
export default async function DebugLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEBUG !== "1"
  ) {
    redirect("/app/home");
  }

  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  let projectMatches: Awaited<ReturnType<typeof listProjects>> = [];
  let discardMatches: Awaited<ReturnType<typeof readDiscards>> = [];
  let projectsScanned = 0;

  if (query.length >= 2) {
    const projects = await listProjects();
    projectsScanned = projects.length;
    const tokens = query.split(/\s+/).filter(Boolean);
    projectMatches = projects.filter((p) => {
      const hay = [p.address, p.bin, p.jobNumber, p.borough, p.zip, p.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    });
    const discards = await readDiscards(800);
    discardMatches = discards.filter((d) => {
      const hay = [d.address, d.bin, d.jobKey, d.detail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    });
  }

  return (
    <main className="px-5 py-6 md:mx-auto md:max-w-3xl md:px-8">
      <h1 className="text-2xl font-bold text-ink">Debug lookup</h1>
      <p className="mt-1 text-sm text-slate">
        Search the ingested project store and discard log (why a filing might
        be missing from the map).
      </p>
      <form className="mt-5 flex gap-2" action="/app/debug/lookup" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="1166 Manhattan Ave or BIN"
          className="h-12 flex-1 rounded-full border border-line bg-white px-4 text-sm"
        />
        <button
          type="submit"
          className="pc-gradient-bg h-12 rounded-full px-5 text-sm font-bold text-white"
        >
          Search
        </button>
      </form>

      {query.length >= 2 && (
        <div className="mt-8 space-y-6">
          <p className="text-xs text-slate">
            Scanned {projectsScanned} projects · {projectMatches.length} hits ·{" "}
            {discardMatches.length} discard hits
          </p>
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
              In store
            </h2>
            <ul className="mt-3 space-y-2">
              {projectMatches.slice(0, 50).map((p) => (
                <li key={p.id} className="pc-card p-3 text-sm">
                  <Link
                    href={`/app/project/${encodeURIComponent(p.id)}`}
                    className="font-bold text-purple hover:underline"
                  >
                    {p.address}
                  </Link>
                  <p className="text-slate">
                    {p.borough} · BIN {p.bin ?? "—"} · score {p.score} (
                    {p.scoreConfidence}) · {p.phase}
                  </p>
                </li>
              ))}
              {!projectMatches.length && (
                <p className="text-sm text-slate">No store matches.</p>
              )}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
              Discard log
            </h2>
            <ul className="mt-3 space-y-2">
              {discardMatches.slice(0, 50).map((d, i) => (
                <li
                  key={`${d.jobKey}-${i}`}
                  className="rounded-xl border border-line bg-offwhite p-3 text-sm"
                >
                  <p className="font-bold text-ink">{d.reason}</p>
                  <p className="text-slate">
                    {d.address ?? "—"} · BIN {d.bin ?? "—"} · {d.dataset} ·{" "}
                    {d.jobKey ?? ""}
                  </p>
                  {d.detail ? (
                    <p className="mt-1 text-xs text-slate">{d.detail}</p>
                  ) : null}
                </li>
              ))}
              {!discardMatches.length && (
                <p className="text-sm text-slate">No discard matches.</p>
              )}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
