/**
 * Resend Email Service Helper
 * Dispatches HTML emails via /api/send-email (Cloudflare Pages Function or Vite dev middleware).
 * Never calls Resend directly from the browser (blocked by CORS).
 */

export interface SendResendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export const sendResendEmail = async ({
  to,
  subject,
  html,
  from = "AI Verse <onboarding@resend.dev>",
}: SendResendEmailParams): Promise<{ success: boolean; data?: any; error?: string }> => {
  const recipients = Array.isArray(to) ? to : [to];

  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: recipients, subject, html, from }),
    });

    // Read response as text first to avoid JSON parse crash on HTML/empty responses
    const text = await response.text();

    // Detect if we got back an HTML page (SPA fallback) instead of JSON
    if (!text || text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
      console.error("Email API Error: /api/send-email returned HTML instead of JSON. The API function is not deployed.");
      return { success: false, error: "Email service is not available. API function may not be deployed." };
    }

    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("Email API Error: Could not parse response:", text.substring(0, 200));
      return { success: false, error: `Invalid API response: ${text.substring(0, 100)}` };
    }

    if (!response.ok || !result.success) {
      const errorMsg = result.error || result.message || `HTTP ${response.status}`;
      console.error("Email API Error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    console.error("Error calling send-email API:", err?.message || err);
    return { success: false, error: err?.message || "Network error sending email" };
  }
};
