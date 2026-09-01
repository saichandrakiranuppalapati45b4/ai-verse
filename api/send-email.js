// Vercel Serverless API Route — sends emails via Resend (server-side, no CORS issues)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

  const { to, subject, html, text, from, reply_to } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  const recipients = Array.isArray(to) ? to : [to];
  const rawSender = from || process.env.RESEND_FROM_EMAIL || "AI Verse <events@aiversevitb.dpdns.org>";
  const rawReplyTo = reply_to || process.env.RESEND_REPLY_TO || "aiverse@vishnu.edu.in";

  const senderEmail = typeof rawSender === "string" ? rawSender.replace(/^["']|["']$/g, "").trim() : "AI Verse <events@aiversevitb.dpdns.org>";
  const replyToEmail = typeof rawReplyTo === "string" ? rawReplyTo.replace(/^["']|["']$/g, "").trim() : "aiverse@vishnu.edu.in";

  const emailPayload = {
    from: senderEmail,
    to: recipients,
    reply_to: replyToEmail,
    subject: (subject || "").trim(),
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
      console.error("Resend API Error:", result);
      return res.status(response.status).json({ success: false, error: result.message || "Failed to send email" });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error sending email via Resend:", err);
    return res.status(500).json({ success: false, error: err.message || "Network error" });
  }
}
