import "server-only";

type Email = { to: string; subject: string; text: string; html: string };

/**
 * Sends transactional email through Resend when RESEND_API_KEY is configured.
 * Email is optional for core app operation: without a provider the message is
 * logged in development and skipped (with a warning) in production.
 */
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Hisab <no-reply@hisab.app>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] To: ${email.to}\nSubject: ${email.subject}\n${email.text}`);
    } else {
      console.warn("[email] RESEND_API_KEY is not configured; email not sent.");
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: email.to, subject: email.subject, text: email.text, html: email.html }),
  });
  if (!response.ok) {
    console.error(`[email] Provider responded with ${response.status}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
  const safeName = escapeHtml(name);
  await sendEmail({
    to,
    subject: "Reset your Hisab password / হিসাব পাসওয়ার্ড রিসেট",
    text: `Hi ${name},\n\nUse this link to reset your Hisab password (valid for 1 hour):\n${url}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Hi ${safeName},</p><p>Use the button below to reset your Hisab password. The link is valid for 1 hour.</p><p><a href="${escapeHtml(url)}" style="background:#166534;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });
}
