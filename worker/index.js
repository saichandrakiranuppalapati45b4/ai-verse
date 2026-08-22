/**
 * Cloudflare Worker entry point
 * Handles /api/send-email route for sending emails via Resend.
 * All other requests are served from static assets (dist/).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle /api/send-email
    if (url.pathname === "/api/send-email") {
      if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
      }

      const RESEND_API_KEY = env.RESEND_API_KEY || "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";

      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
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
          return Response.json(
            { success: false, error: result.message || result.error || "Failed to send email" },
            { status: response.status }
          );
        }

        return Response.json({ success: true, data: result });
      } catch (err) {
        return Response.json(
          { success: false, error: err.message || "Network error" },
          { status: 500 }
        );
      }
    }

    // All other routes — let Cloudflare serve static assets (dist/)
    return env.ASSETS.fetch(request);
  },
};
