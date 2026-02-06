import { createClient } from '@supabase/supabase-js';

const url = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjI0MTAsImV4cCI6MjA4NTI5ODQxMH0.rpoz6t0zPNC3jsGWuxE_YXfifBa2gKkcp27naXjlazE';

const supabase = createClient(url, key);

async function test() {
    console.log('Testing Anon hardcoded connection to:', url);
    try {
        const { data, error } = await supabase.from('characters').select('id').limit(1);
        if (error) {
            console.error('API Error:', error);
        } else {
            console.log('Success! Found:', data.length, 'characters');
        }
    } catch (e) {
        console.error('System Error:', e.message);
    }
}

test();
