import express from 'express';
import { createServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const httpServer = createServer(app);

app.get('/', (req, res) => res.send('OK'));

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Test server on ${PORT}`);
    process.exit(0);
});
