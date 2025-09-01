import { supabase } from "./lib/supabase";

export type AgentContext = { log: (...a:any[]) => void };

export async function agentEcho(payload:any, ctx:AgentContext) {
  ctx.log("echo", payload);
  return { echo: payload };
}

export async function agentIngestSave(payload:any, ctx:AgentContext) {
  const { title, notes, uploader } = payload || {};
  if (!title) throw new Error("title required");
  const { data, error } = await supabase
    .from("ingests")
    .insert({ title, notes, uploader: uploader || "agent" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { saved: data?.id };
}

export const Agents: Record<string, (payload:any, ctx:AgentContext)=>Promise<any>> = {
  echo: agentEcho,
  ingest_save: agentIngestSave
};