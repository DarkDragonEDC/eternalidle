import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("WARNING: Supabase credentials not found in .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isServiceRole = SUPABASE_KEY?.includes("NlcnZpY2Vfcm9sZ");
console.log(
  "[SERVER] Supabase Key Role:",
  isServiceRole ? "SERVICE_ROLE" : "ANON",
);
