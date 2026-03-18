import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjI0MTAsImV4cCI6MjA4NTI5ODQxMH0.rpoz6t0zPNC3jsGWuxE_YXfifBa2gKkcp27naXjlazE";

console.log("URL:", supabaseUrl);
console.log("Key length:", supabaseKey?.length);

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.from('characters').select('id').limit(1);

if (error) {
    console.error("Error connecting to Supabase:", error);
} else {
    console.log("Success! Data:", data);
}
