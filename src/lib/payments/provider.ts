/**
 * PaymentProvider — Stripe Checkout today; Stripe Connect (pay the sign rep)
 * can plug in later without rewriting job invoice UI.
 */

export type CheckoutLine = {
  name: string;
  amountCents: number;
  quantity?: number;
};

export type CreateCheckoutInput = {
  invoiceId: string;
  jobId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  lines: CheckoutLine[];
  metadata?: Record<string, string>;
};

export type CreateCheckoutResult = {
  sessionId: string;
  url: string;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe is not configured (STRIPE_SECRET_KEY)");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail || undefined,
      line_items: input.lines.map((line) => ({
        quantity: line.quantity ?? 1,
        price_data: {
          currency: "usd",
          unit_amount: line.amountCents,
          product_data: { name: line.name },
        },
      })),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        kind: "job_invoice",
        invoiceId: input.invoiceId,
        jobId: input.jobId,
        ...(input.metadata ?? {}),
      },
    });

    if (!session.id || !session.url) {
      throw new Error("Stripe Checkout session missing id/url");
    }
    return { sessionId: session.id, url: session.url };
  }
}

/** Future: StripeConnectPaymentProvider pays connected account (sign rep). */
export class StripeConnectPaymentProvider implements PaymentProvider {
  readonly name = "stripe_connect";

  async createCheckoutSession(
    _input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    throw new Error(
      "Stripe Connect is not wired yet — use StripePaymentProvider until Connect accounts exist.",
    );
  }
}

export function getPaymentProvider(): PaymentProvider {
  const mode = (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase();
  if (mode === "stripe_connect") return new StripeConnectPaymentProvider();
  return new StripePaymentProvider();
}
