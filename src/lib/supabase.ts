import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_KEY!; // service_role
export const supabase = createClient(url, key, { auth: { persistSession: false }});