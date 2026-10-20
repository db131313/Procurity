/**
 * Outbound email for quote links.
 * Uses RESEND_API_KEY when set; otherwise logs a stub (dev-safe).
 */

export async function sendQuoteEmail(input: {
  to: string;
  customerName: string;
  companyName: string;
  acceptUrl: string;
  totalLabel: string;
}): Promise<{ ok: boolean; stub?: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "quotes@procurity.pro";

  const subject = `${input.companyName} — your signage quote`;
  const html = `
    <p>Hi ${input.customerName || "there"},</p>
    <p>${input.companyName} sent you a quote totaling <strong>${input.totalLabel}</strong>.</p>
    <p><a href="${input.acceptUrl}">Review &amp; accept quote</a></p>
    <p>If the button does not work, copy this link:<br/>${input.acceptUrl}</p>
  `;

  if (!key) {
    console.info("[jobs/email stub] Quote email", {
      to: input.to,
      acceptUrl: input.acceptUrl,
      totalLabel: input.totalLabel,
    });
    return { ok: true, stub: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text.slice(0, 300) };
    }
    const body = (await res.json()) as { id?: string };
    return { ok: true, id: body.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "send failed",
    };
  }
}
