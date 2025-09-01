"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agents = void 0;
exports.agentEcho = agentEcho;
exports.agentIngestSave = agentIngestSave;
const supabase_1 = require("./lib/supabase");
async function agentEcho(payload, ctx) {
    ctx.log("echo", payload);
    return { echo: payload };
}
async function agentIngestSave(payload, ctx) {
    const { title, notes, uploader } = payload || {};
    if (!title)
        throw new Error("title required");
    const { data, error } = await supabase_1.supabase
        .from("ingests")
        .insert({ title, notes, uploader: uploader || "agent" })
        .select()
        .single();
    if (error)
        throw new Error(error.message);
    return { saved: data?.id };
}
exports.Agents = {
    echo: agentEcho,
    ingest_save: agentIngestSave
};
