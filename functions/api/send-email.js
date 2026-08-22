/**
 * Cloudflare Pages Function — /api/send-email
 * Sends emails via Resend API (server-side, no CORS issues)
 * 
 * Set RESEND_API_KEY as a Cloudflare Pages secret:
 *   npx wrangler pages secret put RESEND_API_KEY
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const RESEND_API_KEY = env.RESEND_API_KEY || "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { to, subject, html, from } = body;

  if (!to || !subject || !html) {
    return Response.json(
      { success: false, error: "Missing required fields: to, subject, html" },
      { status: 400 }
    );
  }

  const recipients = Array.isArray(to) ? to : [to];
  const senderEmail = from || "AI Verse <noreply@aiversevitb.dpdns.org>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: recipients,
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API Error:", JSON.stringify(result));
      return Response.json(
        { success: false, error: result.message || result.error || "Failed to send email" },
        { status: response.status }
      );
    }

    return Response.json({ success: true, data: result });
  } catch (err) {
    console.error("Error sending email via Resend:", err);
    return Response.json(
      { success: false, error: err.message || "Network error" },
      { status: 500 }
    );
  }
}

// Reject non-POST methods
export async function onRequest() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
