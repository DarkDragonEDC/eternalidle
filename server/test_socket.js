import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const mockDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    const { data: dbChar } = await mockDb.from('characters').select('id, user_id').eq('name', 'testeroleta').single();
    if (!dbChar) return console.log("No testeroleta");

    console.log(`Found testeroleta, charId: ${dbChar.id}, userId: ${dbChar.user_id}`);

    // Generate token
    const token = jwt.sign(
        { sub: dbChar.user_id, email: "testeroleta@script.com", role: 'authenticated', aud: 'authenticated' },
        process.env.SUPABASE_JWT_SECRET,
        { expiresIn: '1h' }
    );

    const socket = io('http://localhost:3001', {
        auth: { token },
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log("Connected to server, emitting join_character");
        socket.emit('join_character', { characterId: dbChar.id });
    });

    socket.on('daily_status', (data) => {
        console.log("RECEIVED DAILY STATUS:", data);
        process.exit(0);
    });

    socket.on('error', (err) => {
        console.log("SOCKET ERROR:", err);
    });
}
run();
