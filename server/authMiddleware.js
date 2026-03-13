import { supabase } from './services/supabase.js';

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

    // Use the shared client to verify the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

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
