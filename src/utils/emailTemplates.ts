/**
 * AI Verse High-Deliverability Email Templates
 * Designed to satisfy Gmail, Outlook, and modern spam filters:
 * - Proper DOCTYPE, meta tags, and responsive structure
 * - Anti-spam footer with clear sender identification and recipient context
 * - Bulletproof CTA buttons without exposing raw suspicious URLs
 * - Matching clean multipart plain text
 */

interface RegistrationEmailData {
  teamLeadName: string;
  eventTitle: string;
  groupName?: string;
  teamLeadStudentId?: string;
  teamSize?: number;
  transactionId?: string;
  members?: Array<{ name: string; studentId?: string; email?: string }>;
  ticketUrl: string;
}

interface CredentialsEmailData {
  teamLeadName: string;
  eventTitle: string;
  groupName?: string;
  teamEmail: string;
  password: string;
  loginUrl?: string;
}

/**
 * Builds registration confirmation HTML & text emails
 */
export function buildRegistrationConfirmationEmail(data: RegistrationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    teamLeadName,
    eventTitle,
    groupName,
    teamLeadStudentId,
    teamSize,
    transactionId,
    members,
    ticketUrl,
  } = data;

  const isTeam = !!groupName && groupName !== "Individual RSVP";
  const displayTeam = isTeam ? groupName : "Individual Entry";
  const totalCount = teamSize || ((members?.length || 0) + 1);

  const subject = `Registration Confirmed: ${eventTitle} | AI Verse`;

  const memberRows = members && members.length > 0
    ? members.map((m, i) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${i + 2}. ${m.name}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-family: monospace;">${m.studentId || m.email || "—"}</td>
      </tr>
    `).join("")
    : "";

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    table { border-collapse: collapse; }
    .btn:hover { background-color: #1d4ed8 !important; }
  </style>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9;">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    Your registration for ${eventTitle} is confirmed. View your entry pass and event details.
    &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 36px 32px; text-align: center;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #93c5fd; text-transform: uppercase; margin-bottom: 8px;">AI VERSE EVENTS</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; line-height: 1.3;">Registration Confirmed</h1>
              <div style="margin-top: 10px; display: inline-block; background-color: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; color: #e0e7ff; font-size: 12px; font-weight: 600;">
                ✓ Official Entry Pass Ready
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="font-size: 16px; line-height: 1.6; color: #0f172a; margin: 0 0 16px 0;">
                Hello <strong>${teamLeadName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                Great news! Your registration for <strong>${eventTitle}</strong> has been officially verified and confirmed.
              </p>

              <!-- Summary Card -->
              <table width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Event</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${eventTitle}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%">
                      <tr>
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Team Name</div>
                          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px;">${displayTeam}</div>
                        </td>
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Participants</div>
                          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px;">${totalCount}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px;">
                    <table width="100%">
                      <tr>
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Lead / Reg ID</div>
                          <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">${teamLeadName} (${teamLeadStudentId || "N/A"})</div>
                        </td>
                        ${transactionId ? `
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Reference ID</div>
                          <div style="font-size: 13px; font-weight: 600; color: #334155; font-family: monospace; margin-top: 2px;">${transactionId}</div>
                        </td>` : `
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Status</div>
                          <div style="font-size: 13px; font-weight: 700; color: #16a34a; margin-top: 2px;">Confirmed ✓</div>
                        </td>`}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${members && members.length > 0 ? `
              <!-- Roster Table -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Registered Team Members</div>
                <table width="100%" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                  <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #475569; text-transform: uppercase;">Name</th>
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #475569; text-transform: uppercase;">ID / Email</th>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                    <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: #1e3a8a;">1. ${teamLeadName} (Lead)</td>
                    <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-family: monospace;">${teamLeadStudentId || "Lead"}</td>
                  </tr>
                  ${memberRows}
                </table>
              </div>
              ` : ""}

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${ticketUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
                  View Entry Pass & QR Code &rarr;
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 8px 0 0 0;">
                Present your QR code pass at the venue entrance desk.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0;">
                <strong>AI Verse Club</strong> • VIT-AP University
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                You are receiving this official registration receipt because you registered for ${eventTitle}.<br>
                For questions or support, reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `AI VERSE - REGISTRATION CONFIRMED`,
    `================================`,
    ``,
    `Hello ${teamLeadName},`,
    ``,
    `Your registration for ${eventTitle} has been confirmed.`,
    ``,
    `EVENT DETAILS:`,
    `- Event: ${eventTitle}`,
    `- Team: ${displayTeam}`,
    `- Lead: ${teamLeadName} (${teamLeadStudentId || "N/A"})`,
    `- Participants: ${totalCount}`,
    transactionId ? `- Reference ID: ${transactionId}` : "",
    `- Status: Confirmed`,
    ``,
    members && members.length > 0
      ? `TEAM MEMBERS:\n` + members.map((m, i) => `${i + 1}. ${m.name} (${m.studentId || m.email})`).join("\n") + "\n"
      : "",
    `VIEW YOUR ENTRY PASS:`,
    `${ticketUrl}`,
    ``,
    `Please present your digital entry pass at the event check-in desk.`,
    ``,
    `Regards,`,
    `AI Verse Team • VIT-AP University`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

/**
 * Builds team credentials login email
 */
export function buildTeamCredentialsEmail(data: CredentialsEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { teamLeadName, eventTitle, groupName, teamEmail, password, loginUrl } = data;
  const teamLabel = groupName || teamLeadName || "Team";
  const subject = `Login Credentials for ${eventTitle} — Team ${teamLabel} | AI Verse`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 32px; text-align: center;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">AI VERSE PORTAL</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800;">Team Access Credentials</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #cbd5e1;">${eventTitle}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 15px; line-height: 1.6; color: #0f172a; margin: 0 0 16px 0;">
                Hello <strong>${teamLeadName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                Official login credentials for team <strong>"${teamLabel}"</strong> have been provisioned for <strong>${eventTitle}</strong>.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 2px dashed #94a3b8; border-radius: 14px; padding: 20px 24px; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                  🔑 YOUR TEAM LOGIN CREDENTIALS
                </div>
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 12px; color: #64748b; display: block;">Team Portal Email:</span>
                  <span style="font-size: 16px; font-weight: 800; color: #2563eb; font-family: monospace;">${teamEmail}</span>
                </div>
                <div>
                  <span style="font-size: 12px; color: #64748b; display: block;">Access Password:</span>
                  <span style="font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace; background-color: #e2e8f0; padding: 2px 8px; border-radius: 6px;">${password}</span>
                </div>
              </div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">
                Use these credentials to submit problem statements, upload SRS/PPT deliverables, submit GitHub repositories, and view round promotion results.
              </p>

              ${loginUrl ? `
              <div style="text-align: center; margin: 28px 0 12px 0;">
                <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 10px;">
                  Open Team Portal Login &rarr;
                </a>
              </div>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                AI Verse Club • VIT-AP University<br>
                Dispatched automatically. Do not share your team password outside your registered team members.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `AI VERSE - TEAM LOGIN ACCESS`,
    `============================`,
    ``,
    `Hello ${teamLeadName},`,
    ``,
    `Credentials for team "${teamLabel}" for ${eventTitle}:`,
    ``,
    `Team Email: ${teamEmail}`,
    `Password: ${password}`,
    loginUrl ? `Login Portal: ${loginUrl}` : "",
    ``,
    `Use these credentials to log in to the submission portal.`,
    ``,
    `AI Verse Club • VIT-B`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
