import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    let token = null;

    if (authHeader) {
        token = authHeader.split(' ')[1];
    } else if (req.body && req.body.token) {
        token = req.body.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Create a temporary Supabase client with the user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        console.error("Auth error:", error);
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user to request
    req.user = user;

    // Attach the "authenticated" supabase client to the request if needed for RLS operations
    req.supabase = supabase;

    next();
};
