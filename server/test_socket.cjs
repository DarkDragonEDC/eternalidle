const { io } = require('socket.io-client');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' });

const mockDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    const { data: dbChar } = await mockDb.from('characters').select('id, user_id').eq('name', 'testeroleta').single();
    if (!dbChar) return console.log("No testeroleta");

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
        console.log("Connected, emitting join_character", dbChar.id);
        socket.emit('join_character', { characterId: dbChar.id });
    });

    socket.on('daily_status', (data) => {
        console.log("DAILY STATUS RECEIVED:", data);
        process.exit(0);
    });

    socket.on('error', (err) => {
        console.log("SOCKET ERROR:", err);
    });

    setTimeout(() => {
        console.log("Timeout waiting for daily_status");
        process.exit(1);
    }, 5000);
}
run();
