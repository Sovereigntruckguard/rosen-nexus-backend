// src/notifier.email-only.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const {
  SUPABASE_URL,
  SUPABASE_KEY,
  SENDGRID_API_KEY,
  MAIL_FROM,
  MAIL_TO,
} = process.env as Record<string, string>;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[notifier-email] Faltan SUPABASE_URL o SUPABASE_KEY');
  process.exit(1);
}
if (!SENDGRID_API_KEY || !MAIL_FROM || !MAIL_TO) {
  console.error('[notifier-email] Faltan envs de SendGrid: SENDGRID_API_KEY, MAIL_FROM, MAIL_TO');
  process.exit(1);
}

const base = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
// IMPORTANT: trabajar siempre sobre el esquema ops
const db = base.schema('ops');

async function fetchPending(limit = 25) {
  const { data, error } = await db
    .from('outbox')
    .select('id, alert_id, target, status, attempts')
    .eq('status', 'pending')
    .eq('target', 'email') // solo email
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getAlert(alert_id: string) {
  const { data, error } = await db
    .from('alert')
    .select('id, type, message, emitted_at')
    .eq('id', alert_id)
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; type: string; message: string; emitted_at: string };
}

async function markSent(outboxId: string) {
  const { error } = await db
    .from('outbox')
    .update({ status: 'sent', last_error: null })
    .eq('id', outboxId);
  if (error) throw new Error(error.message);
}

async function markFailed(outboxId: string, err: string) {
  // IMPORTANTE: RPC calificado con el esquema
  const { error } = await base.rpc('ops.inc_outbox_attempt', { p_id: outboxId, p_error: err });
  if (error) throw new Error(error.message);
}

function fmtAlertText(a: { type: string; message: string; emitted_at: string }) {
  return `⚠️ ALERTA ${a.type.toUpperCase()} @ ${a.emitted_at}\n\n${a.message}`;
}

async function sendEmail(a: { type: string; message: string; emitted_at: string }) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: MAIL_TO }] }],
      from: { email: MAIL_FROM, name: 'ROSÉN Ops' },
      subject: `[ROSÉN] ${a.type.toUpperCase()}`,
      content: [{ type: 'text/plain', value: fmtAlertText(a) }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SendGrid ${res.status} ${text}`);
  }
}

async function main() {
  const items = await fetchPending();
  if (!items.length) {
    console.log('[notifier-email] no pending');
    return;
  }
  for (const it of items) {
    try {
      const a = await getAlert(it.alert_id);
      await sendEmail(a);
      await markSent(it.id);
      console.log(`[notifier-email] sent email for alert ${it.alert_id}`);
    } catch (e: any) {
      console.error('[notifier-email] error:', e.message);
      try { await markFailed(it.id, e.message); } catch (ee: any) {
        console.error('[notifier-email] markFailed error:', ee.message);
      }
    }
  }
}

main().catch((e) => {
  console.error('[notifier-email] fatal:', e.message);
  process.exit(1);
});
