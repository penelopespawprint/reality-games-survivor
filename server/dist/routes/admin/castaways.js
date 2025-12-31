/**
 * Admin Castaways Routes
 *
 * Routes for managing castaways (add, update, eliminate).
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { eliminateCastaway } from '../../services/elimination.js';
const router = Router();
// POST /api/admin/castaways - Add castaway
router.post('/', async (req, res) => {
    try {
        const { season_id, name, age, hometown, occupation, photo_url, tribe_original } = req.body;
        if (!season_id || !name) {
            return res.status(400).json({ error: 'season_id and name are required' });
        }
        const { data: castaway, error } = await supabaseAdmin
            .from('castaways')
            .insert({
            season_id,
            name,
            age,
            hometown,
            occupation,
            photo_url,
            tribe_original,
        })
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.status(201).json({ castaway });
    }
    catch (err) {
        console.error('POST /api/admin/castaways error:', err);
        res.status(500).json({ error: 'Failed to add castaway' });
    }
});
// PATCH /api/admin/castaways/:id - Update castaway
router.patch('/:id', async (req, res) => {
    try {
        const castawayId = req.params.id;
        const updates = req.body;
        const { data: castaway, error } = await supabaseAdmin
            .from('castaways')
            .update(updates)
            .eq('id', castawayId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ castaway });
    }
    catch (err) {
        console.error('PATCH /api/admin/castaways/:id error:', err);
        res.status(500).json({ error: 'Failed to update castaway' });
    }
});
// POST /api/admin/castaways/:id/eliminate - Mark castaway eliminated
router.post('/:id/eliminate', async (req, res) => {
    try {
        const castawayId = req.params.id;
        const { episode_id, placement } = req.body;
        if (!episode_id) {
            return res.status(400).json({ error: 'episode_id is required' });
        }
        // Delegate to elimination service (handles DB updates + notifications)
        const result = await eliminateCastaway({
            castawayId,
            episodeId: episode_id,
            placement,
        });
        res.json({
            castaway: result.castaway,
            notifications: result.notificationsSent,
            affected_users: result.affectedUsers,
        });
    }
    catch (err) {
        console.error('POST /api/admin/castaways/:id/eliminate error:', err);
        res.status(500).json({ error: err.message || 'Failed to eliminate castaway' });
    }
});
export default router;
//# sourceMappingURL=castaways.js.map