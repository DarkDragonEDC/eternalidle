import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

async function test() {
    console.log("Testing create character API with mocked token...");
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers();
        if (!users || users.length === 0) return console.log("No users found");
        
        const testUser = users[0];
        
        // Use SUPABASE_JWT_SECRET to mock a token
        const token = jwt.sign(
            { 
               role: 'authenticated', 
               sub: testUser.id, 
               aud: 'authenticated', 
               email: testUser.email
            }, 
            process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long',
            { expiresIn: '1h' }
        );

        const res = await fetch('http://localhost:3000/api/characters', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ name: 'testchar123', isIronman: false })
        });
        
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);
    } catch(e) {
        console.error("Fetch failed:", e);
    }
}

test();
