import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'resend-dev-api',
      configureServer(server) {
        const handler = async (req: any, res: any) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { to, subject, html, from } = JSON.parse(body || '{}');
              const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";
              const recipients = Array.isArray(to) ? to : [to];
              const senderEmail = from || "AI Verse <onboarding@resend.dev>";

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

              const result = (await response.json()) as any;
              console.log(`[Resend API] Status ${response.status}:`, JSON.stringify(result));
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: response.ok, 
                data: result, 
                error: !response.ok ? (result?.message || result?.error || `Resend Error (HTTP ${response.status})`) : undefined 
              }));
            } catch (err: any) {
              console.error("[Resend API Error]:", err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message || 'Server error' }));
            }
          });
        };

        server.middlewares.use('/api/send-email', handler);
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/send-email', async (req: any, res: any) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { to, subject, html, from } = JSON.parse(body || '{}');
              const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";
              const recipients = Array.isArray(to) ? to : [to];
              const senderEmail = from || "AI Verse <onboarding@resend.dev>";

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

              const result = (await response.json()) as any;
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: response.ok, 
                data: result, 
                error: !response.ok ? (result?.message || result?.error || `Resend Error (HTTP ${response.status})`) : undefined 
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message || 'Server error' }));
            }
          });
        });
      }
    }
  ],
})
