import "server-only";
import { Resend } from "resend";

/**
 * Transactional email via Resend. The integration stays silent if
 * RESEND_API_KEY is not configured — useful while iterating locally
 * or before the user has signed up for a Resend account.
 *
 * From address: defaults to Resend's shared sender so deploys work
 * out-of-the-box, but should be overridden via RESEND_FROM_EMAIL
 * once a center domain (e.g. notifications@congphuhuynh.com) is
 * verified in Resend.
 */
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.RESEND_FROM_EMAIL ||
  "Parent Portal <onboarding@resend.dev>";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://parent-portal-nine.vercel.app";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type NewMessageEmail = {
  toEmail: string;
  toName: string;
  fromName: string;
  /** Localised role label: "Giáo viên" / "Phụ huynh" / "Quản trị". */
  fromRoleLabel: string;
  studentName: string;
  /** Up to ~500 chars; we trim and HTML-escape below. */
  body: string;
  /** Path on the app, e.g. "/parent/students/abc". */
  threadPath: string;
};

export async function sendNewMessageEmail(m: NewMessageEmail): Promise<void> {
  if (!resend) {
    console.log("[email] RESEND_API_KEY not set, skipping notification");
    return;
  }

  const trimmed =
    m.body.length > 500 ? m.body.slice(0, 500).trimEnd() + "…" : m.body;
  const safeBody = escapeHtml(trimmed).replace(/\n/g, "<br>");
  const safeStudent = escapeHtml(m.studentName);
  const safeSender = escapeHtml(m.fromName);
  const safeRole = escapeHtml(m.fromRoleLabel);
  const safeRecipient = escapeHtml(m.toName);
  const link = `${APP_URL}${m.threadPath}`;

  const subject = `Tin nhắn mới về ${m.studentName} · New message about ${m.studentName}`;

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f7f9; margin: 0; padding: 24px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9;">
      <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Cổng Phụ Huynh · Parent Portal</p>
      <h1 style="margin: 0; font-size: 18px; color: #0f172a;">Tin nhắn mới về ${safeStudent}</h1>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">New message about ${safeStudent}</p>
    </div>
    <div style="padding: 20px 24px;">
      <p style="margin: 0 0 12px; color: #0f172a; font-size: 14px;">Chào ${safeRecipient},</p>
      <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.5;">
        <strong style="color: #0f172a;">${safeSender}</strong>
        <span style="color: #94a3b8;">(${safeRole})</span>
        vừa gửi cho bạn một tin nhắn:
      </p>
      <div style="margin: 0 0 20px; padding: 14px 16px; background: #f8fafc; border-left: 3px solid #3b82f6; border-radius: 4px; color: #0f172a; font-size: 14px; line-height: 1.55;">
        ${safeBody}
      </div>
      <p style="margin: 0 0 20px; text-align: center;">
        <a href="${link}" style="display: inline-block; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Mở tin nhắn · Open thread</a>
      </p>
      <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
        Đây là email tự động. Trả lời bằng cách bấm nút trên và đăng nhập vào tài khoản của bạn.<br>
        This is an automated email. Reply by clicking above and signing in.
      </p>
    </div>
  </div>
</body></html>`;

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: m.toEmail,
      subject,
      html,
    });
    if (res.error) {
      console.error("[email] resend returned error:", res.error);
    }
  } catch (err) {
    console.error("[email] send threw:", err);
  }
}
