// src/sla-watcher.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_KEY } = process.env as Record<string, string>;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[sla-watcher] faltan SUPABASE_URL o SUPABASE_KEY');
  process.exit(1);
}

const base = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await base.rpc('ops.sla_watch');
  if (error) {
    console.error('[sla-watcher] rpc error:', error.message);
    process.exit(1);
  }
  const n = Array.isArray(data) ? data.length : 0;
  console.log(`[sla-watcher] alerts emitted: ${n}`);
  if (Array.isArray(data)) {
    for (const r of data) {
      console.log(`  - alert_id=${r.alert_id} task_id=${r.task_id}`);
    }
  }
}
main().catch((e) => {
  console.error('[sla-watcher] fatal:', e.message);
  process.exit(1);
});
