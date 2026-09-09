import Link from "next/link";
import { redirect } from "next/navigation";
import { setOwnDevPlanOverride } from "@/app/actions/dev-plan";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { getUserByFirebaseUid } from "@/lib/db/store";
import {
  PLAN_LIMITS,
  PLAN_PRICING,
  effectivePlan,
  effectiveZipAllowance,
  type PlanTier,
} from "@/lib/db/types";

const OPTIONS: { value: string; label: string }[] = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "pro", label: "Pro" },
  { value: "none", label: "None (clear override)" },
];

function planLabel(plan: PlanTier) {
  if (plan === "trial") return "Trial";
  return PLAN_PRICING[plan as keyof typeof PLAN_PRICING]?.name ?? plan;
}

export default async function AdminDevPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin/dev-plan");
  }
  if (session.demo) {
    redirect("/login?next=/admin/dev-plan");
  }
  if (!isAdminEmail(session.email)) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-bold text-ink">Admin · Dev plan</h1>
        <p className="mt-3 text-sm text-slate">
          Your account ({session.email}) is not on the admin allow-list. Set{" "}
          <code className="rounded bg-offwhite px-1">ADMIN_EMAILS</code> or{" "}
          <code className="rounded bg-offwhite px-1">ADMIN_EMAIL</code> on the
          server.
        </p>
        <Link href="/app/home" className="mt-6 inline-block text-sm font-semibold text-purple">
          ← Back to app
        </Link>
      </main>
    );
  }

  const raw = await getUserByFirebaseUid(session.uid);
  if (!raw) {
    redirect("/login?next=/admin/dev-plan");
  }

  const { ok, error } = await searchParams;
  const effective = effectivePlan(raw);
  const zips = effectiveZipAllowance(raw);

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-slate">
        Internal
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
        Dev plan override
      </h1>
      <p className="mt-2 text-sm text-slate">
        Sets <code className="rounded bg-offwhite px-1">devPlanOverride</code>{" "}
        on your own account only. Stripe checkout still updates the billing plan
        for everyone; the override wins only when this field is set.
      </p>

      <section className="pc-card mt-6 space-y-2 p-5 text-sm">
        <p>
          <span className="font-semibold text-ink">Email</span>{" "}
          <span className="text-slate">{raw.email}</span>
        </p>
        <p>
          <span className="font-semibold text-ink">Billing plan</span>{" "}
          <span className="text-slate">
            {planLabel(raw.plan)} · {PLAN_LIMITS[raw.plan]} zips
          </span>
        </p>
        <p>
          <span className="font-semibold text-ink">Override</span>{" "}
          <span className="text-slate">
            {raw.devPlanOverride
              ? planLabel(raw.devPlanOverride)
              : "None"}
          </span>
        </p>
        <p>
          <span className="font-semibold text-ink">Effective</span>{" "}
          <span className="text-purple font-semibold">
            {planLabel(effective)} · {zips} zips
          </span>
        </p>
      </section>

      {ok ? (
        <p className="mt-4 text-sm font-semibold text-green-700">
          Override updated.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm font-semibold text-hot">
          Could not update ({error}).
        </p>
      ) : null}

      <form action={setOwnDevPlanOverride} className="mt-6 space-y-3">
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate">
            Set my test plan
          </legend>
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              <input
                type="radio"
                name="plan"
                value={opt.value}
                defaultChecked={
                  opt.value === "none"
                    ? !raw.devPlanOverride
                    : raw.devPlanOverride === opt.value
                }
                className="accent-purple"
              />
              {opt.label}
              {opt.value !== "none" ? (
                <span className="ml-auto text-xs font-normal text-slate">
                  {PLAN_LIMITS[opt.value as PlanTier]} zips
                </span>
              ) : null}
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          className="pc-gradient-bg h-11 w-full rounded-full text-sm font-bold text-white"
        >
          Save override
        </button>
      </form>

      <Link
        href="/app/settings"
        className="mt-8 inline-block text-sm font-semibold text-purple"
      >
        ← Settings
      </Link>
    </main>
  );
}
