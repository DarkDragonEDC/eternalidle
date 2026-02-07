import express from 'express';
import { INITIAL_SKILLS } from '../../shared/skills.js';

const router = express.Router();

export const characterRoutes = (gameManager) => {
    const supabase = gameManager.supabase;

    // List Characters
    router.get('/', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('user_id', req.user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            res.json(data);
        } catch (err) {
            console.error('Error fetching characters:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Create Character
    router.post('/', async (req, res) => {
        try {
            const { name, isIronman } = req.body;
            if (!name || name.length < 3) {
                return res.status(400).json({ error: 'Name must be at least 3 characters long.' });
            }

            const data = await gameManager.createCharacter(req.user.id, name, isIronman);
            res.json(data);
        } catch (err) {
            console.error('Error creating character:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete Character
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await gameManager.deleteCharacter(req.user.id, id);
            res.json(result);
        } catch (err) {
            console.error('Error deleting character:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
