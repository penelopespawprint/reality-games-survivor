/**
 * Admin Seasons Routes
 *
 * Handles season CRUD, activation, and date management
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { seasonConfig } from '../../lib/season-config.js';
import { scheduleAutoRandomizeRankings, scheduleDraftFinalize } from '../../jobs/index.js';
const router = Router();
// POST /api/admin/seasons - Create season
router.post('/', async (req, res) => {
    try {
        const { number, name, registration_opens_at, draft_order_deadline, registration_closes_at, premiere_at, draft_deadline, finale_at, } = req.body;
        if (!number || !name || !premiere_at || !draft_deadline) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { data: season, error } = await supabaseAdmin
            .from('seasons')
            .insert({
            number,
            name,
            registration_opens_at,
            draft_order_deadline,
            registration_closes_at,
            premiere_at,
            draft_deadline,
            finale_at,
        })
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.status(201).json({ season });
    }
    catch (err) {
        console.error('POST /api/admin/seasons error:', err);
        res.status(500).json({ error: 'Failed to create season' });
    }
});
// PATCH /api/admin/seasons/:id - Update season
router.patch('/:id', async (req, res) => {
    try {
        const seasonId = req.params.id;
        const updates = req.body;
        const { data: season, error } = await supabaseAdmin
            .from('seasons')
            .update(updates)
            .eq('id', seasonId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // If updating dates, invalidate cache
        if (updates.draft_deadline || updates.draft_order_deadline || updates.registration_closes_at) {
            seasonConfig.invalidateCache();
            console.log('Season dates updated, cache invalidated');
        }
        res.json({ season });
    }
    catch (err) {
        console.error('PATCH /api/admin/seasons/:id error:', err);
        res.status(500).json({ error: 'Failed to update season' });
    }
});
// POST /api/admin/seasons/:id/activate - Set active season
router.post('/:id/activate', async (req, res) => {
    try {
        const seasonId = req.params.id;
        // Deactivate all seasons
        await supabaseAdmin
            .from('seasons')
            .update({ is_active: false })
            .neq('id', seasonId);
        // Activate this season
        const { data: season, error } = await supabaseAdmin
            .from('seasons')
            .update({ is_active: true })
            .eq('id', seasonId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Invalidate cache when activating a new season
        seasonConfig.invalidateCache();
        console.log(`Season ${season.number} activated, cache invalidated`);
        res.json({ season, previous_deactivated: true });
    }
    catch (err) {
        console.error('POST /api/admin/seasons/:id/activate error:', err);
        res.status(500).json({ error: 'Failed to activate season' });
    }
});
// PATCH /api/admin/seasons/:id/dates - Update season dates and reschedule jobs
router.patch('/:id/dates', async (req, res) => {
    try {
        const seasonId = req.params.id;
        const { draft_deadline, draft_order_deadline, registration_closes_at, premiere_at } = req.body;
        // Build updates object with only provided fields
        const updates = {};
        if (draft_deadline !== undefined)
            updates.draft_deadline = draft_deadline;
        if (draft_order_deadline !== undefined)
            updates.draft_order_deadline = draft_order_deadline;
        if (registration_closes_at !== undefined)
            updates.registration_closes_at = registration_closes_at;
        if (premiere_at !== undefined)
            updates.premiere_at = premiere_at;
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No date fields provided' });
        }
        // Update season dates
        const { data: season, error } = await supabaseAdmin
            .from('seasons')
            .update(updates)
            .eq('id', seasonId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Invalidate cache
        seasonConfig.invalidateCache();
        console.log('Season dates updated, cache invalidated');
        // If this is the active season and we updated relevant dates, reschedule one-time jobs
        if (season.is_active) {
            const rescheduled = [];
            if (updates.draft_order_deadline) {
                await scheduleAutoRandomizeRankings();
                rescheduled.push('auto-randomize-rankings');
            }
            if (updates.draft_deadline) {
                await scheduleDraftFinalize();
                rescheduled.push('draft-finalize');
            }
            if (rescheduled.length > 0) {
                console.log(`Rescheduled jobs: ${rescheduled.join(', ')}`);
                return res.json({ season, rescheduled_jobs: rescheduled });
            }
        }
        res.json({ season });
    }
    catch (err) {
        console.error('PATCH /api/admin/seasons/:id/dates error:', err);
        res.status(500).json({ error: 'Failed to update season dates' });
    }
});
export default router;
//# sourceMappingURL=seasons.js.map