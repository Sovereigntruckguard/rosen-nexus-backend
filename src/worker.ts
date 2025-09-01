import "dotenv/config";
import { supabase } from "./lib/supabase";
import { Agents } from "./agents";

const sleep = (ms:number) => new Promise((r)=>setTimeout(r, ms));

async function loop() {
  const agent = process.env.WORKER_AGENT || "orchestrator";
  const backoffMs = Number(process.env.BACKOFF_SECONDS || 5) * 1000;

  for (;;) {
    try {
      const { data: task, error } = await supabase.rpc("claim_task", { p_agent: agent });
      if (error) throw new Error(error.message);

      if (!task) {
        await sleep(backoffMs);
        continue;
      }

      const fn = Agents[task.type];
      if (!fn) throw new Error(`unknown task type: ${task.type}`);

      const result = await fn(task.payload, { log: console.log });

      await supabase
        .from("tasks")
        .update({ status: "done", result, updated_at: new Date().toISOString(), error: null })
        .eq("id", task.id);

      console.log("[worker] done:", task.id, task.type);
    } catch (e:any) {
      console.error("[worker] error:", e.message);
      await sleep(backoffMs);
    }
  }
}

loop().catch((e)=>{ console.error("[worker] fatal:", e.message); process.exit(1); });