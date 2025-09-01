"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY; // service_role
exports.supabase = (0, supabase_js_1.createClient)(url, key, { auth: { persistSession: false } });
