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
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }

      const RESEND_API_KEY = env.RESEND_API_KEY || "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { to, subject, html, text, from } = body;

      if (!to || !subject || !html) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields: to, subject, html" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const recipients = Array.isArray(to) ? to : [to];
      const senderEmail = from || "AI Verse <noreply@aiversevitb.dpdns.org>";

      const emailPayload = {
        from: senderEmail,
        to: recipients,
        subject,
        html,
      };
      if (text) {
        emailPayload.text = text;
      }

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        const result = await response.json();

        if (!response.ok) {
          return new Response(
            JSON.stringify({ success: false, error: result.message || result.error || "Failed to send email" }),
            { status: response.status, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, data: result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message || "Network error" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // All other routes — serve static assets from dist/
    try {
      return await env.ASSETS.fetch(request);
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
