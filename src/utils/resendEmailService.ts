/**
 * Resend Email Service Helper
 * Dispatches HTML emails via Vercel serverless API route (/api/send-email)
 * This avoids CORS issues that occur when calling Resend directly from the browser.
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
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject, html, from }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("Email API Error:", result);
      return { success: false, error: result.error || "Failed to send email" };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    console.error("Error calling send-email API:", err);
    return { success: false, error: err.message || "Network error sending email" };
  }
};
