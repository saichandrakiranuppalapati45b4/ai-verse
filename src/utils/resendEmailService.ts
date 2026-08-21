/**
 * Resend Email Service Helper
 * Dispatches HTML emails via API route with direct Resend fallback.
 */

export interface SendResendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

const DEFAULT_RESEND_API_KEY = "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";

export const sendResendEmail = async ({
  to,
  subject,
  html,
  from = "AI Verse <onboarding@resend.dev>",
}: SendResendEmailParams): Promise<{ success: boolean; data?: any; error?: string }> => {
  const recipients = Array.isArray(to) ? to : [to];

  // 1. Try local/serverless /api/send-email endpoint first
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: recipients, subject, html, from }),
    });

    const text = await response.text();
    const isHtmlResponse = text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html");

    // If endpoint responded with valid JSON
    if (!isHtmlResponse && text.trim().startsWith("{")) {
      try {
        const result = JSON.parse(text);
        if (response.ok && result.success) {
          return { success: true, data: result.data };
        }
        if (result.error) {
          console.error("Resend Server Error:", result.error);
          return { success: false, error: result.error };
        }
      } catch (parseErr) {
        console.warn("Error parsing /api/send-email JSON:", parseErr);
      }
    }
  } catch (apiErr) {
    console.warn("Primary /api/send-email route unreachable, trying direct Resend fallback:", apiErr);
  }

  // 2. Fallback: Call Resend API directly from browser
  try {
    const directResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEFAULT_RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
      }),
    });

    const directText = await directResponse.text();
    let directResult: any = {};
    try {
      directResult = directText ? JSON.parse(directText) : {};
    } catch {
      directResult = { message: directText };
    }

    if (!directResponse.ok) {
      const errMsg = directResult?.message || directResult?.error || `HTTP ${directResponse.status}`;
      console.error("Resend API Direct Error:", errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, data: directResult };
  } catch (err: any) {
    console.error("Error dispatching email:", err?.message || err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
};
