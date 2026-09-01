import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY || '';
  const defaultFromEmail = env.RESEND_FROM_EMAIL || env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'AI Verse <events@aiversevitb.dpdns.org>';
  const defaultReplyTo = env.RESEND_REPLY_TO || env.VITE_RESEND_REPLY_TO || process.env.RESEND_REPLY_TO || 'aiverse@vishnu.edu.in';

  return {
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
                const { to, subject, html, text, from, reply_to } = JSON.parse(body || '{}');
                const RESEND_API_KEY = resendApiKey;
                if (!RESEND_API_KEY) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured in .env' }));
                  return;
                }
                const recipients = Array.isArray(to) ? to : [to];
                const rawSender = from || defaultFromEmail;
                const rawReplyTo = reply_to || defaultReplyTo;

                const senderEmail = typeof rawSender === "string" ? rawSender.replace(/^["']|["']$/g, "").trim() : defaultFromEmail;
                const replyToEmail = typeof rawReplyTo === "string" ? rawReplyTo.replace(/^["']|["']$/g, "").trim() : defaultReplyTo;

                const emailPayload: any = {
                  from: senderEmail,
                  to: recipients,
                  reply_to: replyToEmail,
                  subject: (subject || "").trim(),
                  html,
                };
                if (text) {
                  emailPayload.text = text;
                }

                const response = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(emailPayload),
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
                const { to, subject, html, text, from, reply_to } = JSON.parse(body || '{}');
                const RESEND_API_KEY = resendApiKey;
                if (!RESEND_API_KEY) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured in .env' }));
                  return;
                }
                const recipients = Array.isArray(to) ? to : [to];
                const rawSender = from || defaultFromEmail;
                const rawReplyTo = reply_to || defaultReplyTo;

                const senderEmail = typeof rawSender === "string" ? rawSender.replace(/^["']|["']$/g, "").trim() : defaultFromEmail;
                const replyToEmail = typeof rawReplyTo === "string" ? rawReplyTo.replace(/^["']|["']$/g, "").trim() : defaultReplyTo;

                const emailPayload: any = {
                  from: senderEmail,
                  to: recipients,
                  reply_to: replyToEmail,
                  subject: (subject || "").trim(),
                  html,
                };
                if (text) {
                  emailPayload.text = text;
                }

                const response = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(emailPayload),
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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Split heavy vendor libraries into separate chunks
            // so participants never download admin-only dependencies
            if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/@supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/three/')) {
              return 'vendor-three';
            }
          }
        }
      }
    }
  };
})
