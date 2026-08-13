import Link from "next/link";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { listEvents, getProject } from "@/lib/db/store";

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

export default async function AlertsPage() {
  const events = await listEvents();

  const enriched = await Promise.all(
    events.map(async (event) => {
      const project = await getProject(event.projectId);
      return { event, project };
    }),
  );

  const groups = new Map<string, typeof enriched>();
  for (const row of enriched) {
    const key = dayLabel(row.event.createdAt);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return (
    <main className="px-5 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Alerts
      </h1>
      <p className="mt-1 text-sm text-slate">
        Score jumps, phase changes, and new hot opportunities.
      </p>

      {!enriched.length ? (
        <div className="pc-card mt-8 p-8 text-center">
          <p className="font-bold text-ink">No alerts yet</p>
          <p className="mt-1 text-sm text-slate">
            Run a DOB sync or explore seed projects on the map.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day}>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate">
                {day}
              </h2>
              <ul className="mt-3 space-y-2">
                {items.map(({ event, project }) => (
                  <li key={event.id}>
                    <Link
                      href={`/app/project/${encodeURIComponent(event.projectId)}`}
                      className="pc-card block p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-purple">
                        {event.type.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 font-bold text-ink">{event.title}</p>
                      <p className="mt-0.5 text-sm text-slate">{event.body}</p>
                      {project && (
                        <p className="mt-2 text-xs font-semibold text-ink">
                          {project.address}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
