"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supabase_1 = require("./lib/supabase");
const agents_1 = require("./agents");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function loop() {
    const agent = process.env.WORKER_AGENT || "orchestrator";
    const backoffMs = Number(process.env.BACKOFF_SECONDS || 5) * 1000;
    for (;;) {
        try {
            const { data: task, error } = await supabase_1.supabase.rpc("claim_task", { p_agent: agent });
            if (error)
                throw new Error(error.message);
            if (!task) {
                await sleep(backoffMs);
                continue;
            }
            const fn = agents_1.Agents[task.type];
            if (!fn)
                throw new Error(`unknown task type: ${task.type}`);
            const result = await fn(task.payload, { log: console.log });
            await supabase_1.supabase
                .from("tasks")
                .update({ status: "done", result, updated_at: new Date().toISOString(), error: null })
                .eq("id", task.id);
            console.log("[worker] done:", task.id, task.type);
        }
        catch (e) {
            console.error("[worker] error:", e.message);
            await sleep(backoffMs);
        }
    }
}
loop().catch((e) => { console.error("[worker] fatal:", e.message); process.exit(1); });
