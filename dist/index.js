"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("./lib/supabase");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "5mb" }));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
// ------- Ingest -------
const IngestSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    notes: zod_1.z.string().optional(),
    uploader: zod_1.z.string().default("dashboard"),
});
app.post("/ingest", async (req, res) => {
    const parsed = IngestSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const { title, notes, uploader } = parsed.data;
    const { data, error } = await supabase_1.supabase.from("ingests").insert({ title, notes, uploader }).select().single();
    if (error)
        return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, saved: data });
});
app.get("/ingests", async (_req, res) => {
    const { data, error } = await supabase_1.supabase.from("ingests").select("*").order("created_at", { ascending: false }).limit(20);
    if (error)
        return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, items: data });
});
// ------- Tasks -------
const TaskSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    payload: zod_1.z.any().default({}),
    priority: zod_1.z.number().int().min(1).max(10).default(5)
});
app.post("/tasks", async (req, res) => {
    const p = TaskSchema.safeParse(req.body);
    if (!p.success)
        return res.status(400).json({ ok: false, error: p.error.flatten() });
    const { data, error } = await supabase_1.supabase.from("tasks").insert({
        type: p.data.type, payload: p.data.payload, priority: p.data.priority, status: "queued"
    }).select().single();
    if (error)
        return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, queued: data });
});
app.get("/tasks", async (_req, res) => {
    const { data, error } = await supabase_1.supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
    if (error)
        return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, items: data });
});
const port = Number(process.env.PORT || 5051);
app.listen(port, () => console.log(`[api] listening on :${port}`));
