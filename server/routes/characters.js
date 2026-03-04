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

            // Rehydrate state for frontend compatibility (matches GameManager logic)
            const processedData = data.map(char => {
                if (!char.state) char.state = {};

                // Normalize state (Handle potential double nesting)
                if (char.state.state) {
                    char.state = char.state.state;
                }

                // Inject separate columns back into state
                if (char.inventory) char.state.inventory = char.inventory;
                if (char.skills) char.state.skills = char.skills;
                if (char.equipment) char.state.equipment = char.equipment;
                if (char.combat) char.state.combat = char.combat;
                if (char.dungeon) char.state.dungeon = char.dungeon;

                if (char.info) {
                    if (char.info.stats) char.state.stats = char.info.stats;
                    if (char.info.health !== undefined) char.state.health = char.info.health;
                    if (char.info.silver !== undefined) char.state.silver = char.info.silver;
                    if (char.info.orbs !== undefined) char.state.orbs = char.info.orbs;
                    if (char.info.membership) char.state.membership = char.info.membership;
                    if (char.info.active_buffs) char.state.active_buffs = char.info.active_buffs;
                    if (char.info.inventorySlots !== undefined) char.state.inventorySlots = char.info.inventorySlots;
                    if (char.info.extraInventorySlots !== undefined) char.state.extraInventorySlots = char.info.extraInventorySlots;
                    if (char.info.unlockedTitles) char.state.unlockedTitles = char.info.unlockedTitles;
                }

                return char;
            });

            res.json(processedData);
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
