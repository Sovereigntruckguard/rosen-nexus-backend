import "dotenv/config";
import express from "express";
import { z } from "zod";
import { supabase } from "./lib/supabase";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// ------- Ingest -------
const IngestSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  uploader: z.string().default("dashboard"),
});
app.post("/ingest", async (req, res) => {
  const parsed = IngestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok:false, error: parsed.error.flatten() });
  const { title, notes, uploader } = parsed.data;
  const { data, error } = await supabase.from("ingests").insert({ title, notes, uploader }).select().single();
  if (error) return res.status(500).json({ ok:false, error: error.message });
  return res.status(200).json({ ok:true, saved: data });
});
app.get("/ingests", async (_req, res) => {
  const { data, error } = await supabase.from("ingests").select("*").order("created_at", { ascending:false }).limit(20);
  if (error) return res.status(500).json({ ok:false, error: error.message });
  return res.status(200).json({ ok:true, items: data });
});

// ------- Tasks -------
const TaskSchema = z.object({
  type: z.string().min(1),
  payload: z.any().default({}),
  priority: z.number().int().min(1).max(10).default(5)
});
app.post("/tasks", async (req, res) => {
  const p = TaskSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ ok:false, error: p.error.flatten() });
  const { data, error } = await supabase.from("tasks").insert({
    type: p.data.type, payload: p.data.payload, priority: p.data.priority, status: "queued"
  }).select().single();
  if (error) return res.status(500).json({ ok:false, error: error.message });
  return res.status(200).json({ ok:true, queued: data });
});
app.get("/tasks", async (_req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending:false })
    .limit(50);
  if (error) return res.status(500).json({ ok:false, error: error.message });
  return res.status(200).json({ ok:true, items: data });
});

const port = Number(process.env.PORT || 5051);
app.listen(port, () => console.log(`[api] listening on :${port}`));