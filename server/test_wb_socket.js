import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
    auth: {
        token: 'DUMMY_TOKEN' // The server middleware might fail, but we can see if it reaches the handler
    }
});

socket.on('connect', () => {
    console.log('Connected to server!');
    // We need to bypass auth or use a real token. 
    // Since I'm testing the handler logic, I'll just see if I can get some response.
    socket.emit('get_world_boss_status');
});

socket.on('world_boss_status', (data) => {
    console.log('Received World Boss Status:', JSON.stringify(data, null, 2));
    process.exit(0);
});

socket.on('error', (err) => {
    console.error('Socket Error:', err);
    process.exit(1);
});

socket.on('connect_error', (err) => {
    console.error('Connect Error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('Timeout waiting for response.');
    process.exit(1);
}, 5000);
