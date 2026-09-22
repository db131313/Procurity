"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import {
  createProspectPromotionCode,
  ensureDiscountCoupons,
  ensureTestModePromoCodes,
  isDiscountLevel,
  isStripeTestMode,
  type DiscountLevel,
} from "@/lib/stripe/promotion-codes";

export async function ensurePromoCatalogAction() {
  const session = await getSession();
  if (!session || session.demo) {
    redirect("/login?next=/admin/promos");
  }
  if (!isAdminEmail(session.email)) {
    redirect("/admin/promos?error=forbidden");
  }
  if (!stripeConfigured()) {
    redirect("/admin/promos?error=stripe");
  }
  const stripe = getStripe();
  if (!stripe) redirect("/admin/promos?error=stripe");

  const coupons = await ensureDiscountCoupons(stripe);
  if (isStripeTestMode(process.env.STRIPE_SECRET_KEY)) {
    await ensureTestModePromoCodes(stripe, coupons);
  }
  revalidatePath("/admin/promos");
  redirect("/admin/promos?ok=ensured");
}

export async function createPromoCodeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.demo) {
    redirect("/login?next=/admin/promos");
  }
  if (!isAdminEmail(session.email)) {
    redirect("/admin/promos?error=forbidden");
  }
  if (!stripeConfigured()) {
    redirect("/admin/promos?error=stripe");
  }
  const stripe = getStripe();
  if (!stripe) redirect("/admin/promos?error=stripe");

  const levelNum = Number(formData.get("level") || "");
  if (!isDiscountLevel(levelNum)) {
    redirect("/admin/promos?error=invalid");
  }
  const level = levelNum as DiscountLevel;
  const custom = String(formData.get("code") || "").trim();
  const maxRaw = Number(formData.get("max") || "1");
  const maxRedemptions =
    Number.isFinite(maxRaw) && maxRaw > 0 ? Math.min(1000, maxRaw) : 1;

  try {
    const promo = await createProspectPromotionCode(stripe, level, {
      code: custom || undefined,
      maxRedemptions,
    });
    revalidatePath("/admin/promos");
    redirect(
      `/admin/promos?ok=created&code=${encodeURIComponent(promo.code)}&level=${level}`,
    );
  } catch (err) {
    console.error("createPromoCodeAction", err);
    redirect("/admin/promos?error=create");
  }
}
