import "server-only";
import { Resend } from "resend";

// Replace with your real Resend API key (https://resend.com/api-keys) or set
// RESEND_API_KEY in your environment. The placeholder keeps sending disabled
// until configured.
const API_KEY = process.env.RESEND_API_KEY ?? "re_xxxxxxxxx";
const FROM = process.env.RESEND_FROM ?? "Triply <onboarding@resend.dev>";

export function resendConfigured(): boolean {
  return Boolean(API_KEY && !API_KEY.startsWith("re_xxx"));
}

/**
 * Sends an email via Resend. Returns true on success, false when not
 * configured or the send fails (never throws — callers treat it as best-effort).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!to || !resendConfigured()) return false;
  try {
    const resend = new Resend(API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error("resend: send failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("resend: send threw", err);
    return false;
  }
}

/** Builds a simple booking-confirmation email body. */
export function bookingEmailHtml({
  brand,
  reference,
  title,
  subtitle,
  amount,
  currency,
}: {
  brand: string;
  reference: string;
  title: string;
  subtitle: string;
  amount: string;
  currency: string;
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 4px">${brand} — Booking confirmed</h2>
      <p style="margin:0 0 20px;color:#64748b">Your booking is secured.</p>
      <table style="width:100%;border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;padding:16px">
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px">Booking ref</td>
            <td style="padding:4px 0;text-align:right;font-weight:600">${reference}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px">${title}</td>
            <td style="padding:4px 0;text-align:right;font-weight:600">${subtitle}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px">Total</td>
            <td style="padding:4px 0;text-align:right;font-weight:700">${amount} ${currency}</td></tr>
      </table>
      <p style="margin:20px 0 0;color:#64748b;font-size:12px">
        Need changes? Manage this booking in the Triply app.
      </p>
    </div>
  `;
}