import { PhoneShell } from "@/components/mobile/PhoneShell";

export default function AlertsPage() {
  return (
    <PhoneShell>
      <main className="min-h-[100dvh] bg-white px-5 pb-8 pt-6">
        <h1 className="text-2xl font-bold text-pc-ink">Alerts</h1>
        <p className="mt-1 text-sm text-pc-slate">
          Get pinged when a site enters the buying window.
        </p>
        <div className="mt-6 space-y-3">
          {[
            "Hot score crossed 80 in Brooklyn",
            "New SIGN work filed near your territory",
            "Permit Entire issued — follow up this week",
          ].map((text) => (
            <div
              key={text}
              className="rounded-2xl border border-pc-line bg-pc-mist/60 px-4 py-3 text-sm font-medium text-pc-ink"
            >
              {text}
            </div>
          ))}
        </div>
      </main>
    </PhoneShell>
  );
}
