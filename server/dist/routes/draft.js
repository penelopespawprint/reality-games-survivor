/**
 * Draft Routes
 *
 * HTTP layer for draft operations.
 * Business logic is delegated to the draft service.
 */
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import * as DraftService from '../services/draft.js';
const router = Router();
// GET /api/leagues/:id/draft/state - Get draft state
router.get('/:id/draft/state', authenticate, async (req, res) => {
    try {
        const leagueId = req.params.id;
        const userId = req.user.id;
        const result = await DraftService.getDraftState(leagueId, userId);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('GET /api/leagues/:id/draft/state error:', err);
        res.status(500).json({ error: 'Failed to fetch draft state' });
    }
});
// GET /api/leagues/:id/draft/order - Get draft order
router.get('/:id/draft/order', authenticate, async (req, res) => {
    try {
        const leagueId = req.params.id;
        const result = await DraftService.getDraftOrder(leagueId);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('GET /api/leagues/:id/draft/order error:', err);
        res.status(500).json({ error: 'Failed to fetch draft order' });
    }
});
// POST /api/leagues/:id/draft/pick - Make a draft pick
router.post('/:id/draft/pick', authenticate, async (req, res) => {
    try {
        const leagueId = req.params.id;
        const userId = req.user.id;
        const { castaway_id } = req.body;
        const result = await DraftService.makeDraftPick(leagueId, userId, castaway_id);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('POST /api/leagues/:id/draft/pick error:', err);
        res.status(500).json({ error: 'Failed to make draft pick' });
    }
});
// POST /api/leagues/:id/draft/set-order - Set or randomize draft order
router.post('/:id/draft/set-order', authenticate, async (req, res) => {
    try {
        const leagueId = req.params.id;
        const userId = req.user.id;
        const { order, randomize } = req.body;
        const isAdmin = req.user.role === 'admin';
        const result = await DraftService.setDraftOrder(leagueId, userId, isAdmin, order, randomize);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('POST /api/leagues/:id/draft/set-order error:', err);
        res.status(500).json({ error: 'Failed to set draft order' });
    }
});
// POST /api/draft/finalize-all - Auto-complete all incomplete drafts (system/cron)
router.post('/finalize-all', requireAdmin, async (req, res) => {
    try {
        const result = await DraftService.finalizeAllDrafts();
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('POST /api/draft/finalize-all error:', err);
        res.status(500).json({ error: 'Failed to finalize drafts' });
    }
});
export default router;
//# sourceMappingURL=draft.js.map