import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createPromoCodeAction,
  ensurePromoCatalogAction,
} from "@/app/actions/promos";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import {
  DISCOUNT_LEVELS,
  ensureDiscountCoupons,
  ensureTestModePromoCodes,
  isStripeTestMode,
} from "@/lib/stripe/promotion-codes";
import { PromoCodeCopy } from "@/components/admin/PromoCodeCopy";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    code?: string;
    level?: string;
  }>;
};

export default async function AdminPromosPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/promos");
  if (session.demo) redirect("/login?next=/admin/promos");
  if (!isAdminEmail(session.email)) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Internal · 403
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Admin · Promos</h1>
        <p className="mt-3 text-sm text-slate">
          Your account ({session.email}) is not on the admin allow-list.
        </p>
        <Link
          href="/app/home"
          className="mt-6 inline-block text-sm font-semibold text-purple"
        >
          ← Back to app
        </Link>
      </main>
    );
  }

  const sp = await searchParams;
  const stripeOk = stripeConfigured();
  let couponSummary: { level: number; id: string; duration: string }[] = [];
  let testCodes: Record<number, string> | null = null;

  if (stripeOk) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const coupons = await ensureDiscountCoupons(stripe);
        couponSummary = DISCOUNT_LEVELS.map((level) => ({
          level,
          id: coupons[level].id,
          duration: coupons[level].duration,
        }));
        if (isStripeTestMode(process.env.STRIPE_SECRET_KEY)) {
          testCodes = await ensureTestModePromoCodes(stripe, coupons);
        }
      } catch (err) {
        console.error("admin/promos list", err);
      }
    }
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-slate">
        Internal
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
        Promotion codes
      </h1>
      <p className="mt-2 text-sm text-slate">
        Generates Stripe Promotion Codes tied to the standard 25 / 50 / 75 /
        100% coupons. Checkout already shows Stripe&apos;s native &quot;Add
        promotion code&quot; field.
      </p>

      {!stripeOk ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Stripe is not configured on this environment.
        </p>
      ) : null}

      {sp.ok === "created" && sp.code ? (
        <div className="mt-4 rounded-2xl border border-teal/30 bg-teal/10 px-3 py-3">
          <p className="text-sm font-semibold text-ink">
            Created {sp.level ? `${sp.level}%` : ""} code
          </p>
          <PromoCodeCopy code={sp.code} />
        </div>
      ) : null}
      {sp.ok === "ensured" ? (
        <p className="mt-4 text-sm font-semibold text-green-700">
          Coupon catalog ensured.
        </p>
      ) : null}
      {sp.error ? (
        <p className="mt-4 text-sm font-semibold text-hot">
          Something went wrong ({sp.error}).
        </p>
      ) : null}

      <section className="pc-card mt-6 space-y-2 p-5 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Coupons
        </p>
        {couponSummary.length ? (
          <ul className="space-y-1.5">
            {couponSummary.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span className="font-semibold text-ink">{c.level}% off</span>
                <span className="font-mono text-xs text-slate">
                  {c.duration} · {c.id}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate">Not loaded yet — ensure catalog below.</p>
        )}
        <form action={ensurePromoCatalogAction} className="pt-2">
          <button
            type="submit"
            className="h-10 w-full rounded-full border-2 border-line bg-white text-sm font-bold text-ink"
          >
            Ensure coupons (+ test codes if sk_test)
          </button>
        </form>
      </section>

      {testCodes ? (
        <section className="pc-card mt-4 space-y-2 p-5 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate">
            Test-mode QA codes
          </p>
          <ul className="space-y-2">
            {DISCOUNT_LEVELS.map((level) => (
              <li key={level}>
                <span className="text-xs font-semibold text-slate">
                  {level}%
                </span>
                <PromoCodeCopy code={testCodes![level]!} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={createPromoCodeAction} className="pc-card mt-4 space-y-4 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Generate prospect code
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Discount level</legend>
          {DISCOUNT_LEVELS.map((level) => (
            <label
              key={level}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              <input
                type="radio"
                name="level"
                value={level}
                defaultChecked={level === 100}
                className="accent-purple"
              />
              {level}% off
              <span className="ml-auto text-xs font-normal text-slate">
                {level === 100 ? "forever" : "first invoice"}
              </span>
            </label>
          ))}
        </fieldset>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate">
          Custom code (optional)
          <input
            name="code"
            placeholder="AUTO if blank"
            className="mt-1.5 flex h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold uppercase text-ink"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate">
          Max redemptions
          <input
            name="max"
            type="number"
            min={1}
            max={1000}
            defaultValue={1}
            className="mt-1.5 flex h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={!stripeOk}
          className="pc-gradient-bg h-11 w-full rounded-full text-sm font-bold text-white disabled:opacity-50"
        >
          Generate &amp; copy
        </button>
      </form>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-purple">
        <Link href="/admin/dev-plan">← Dev plan</Link>
        <Link href="/app/settings">Settings</Link>
      </div>
    </main>
  );
}
