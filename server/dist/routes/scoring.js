/**
 * Scoring Routes
 *
 * HTTP layer for scoring operations.
 * Business logic is delegated to the scoring service.
 */
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import * as ScoringService from '../services/scoring.js';
const router = Router();
// POST /api/episodes/:id/scoring/start - Begin scoring session
router.post('/:id/scoring/start', requireAdmin, async (req, res) => {
    try {
        const episodeId = req.params.id;
        const result = await ScoringService.startScoringSession(episodeId);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('POST /api/episodes/:id/scoring/start error:', err);
        res.status(500).json({ error: 'Failed to start scoring session' });
    }
});
// POST /api/episodes/:id/scoring/save - Save progress
router.post('/:id/scoring/save', requireAdmin, async (req, res) => {
    try {
        const episodeId = req.params.id;
        const userId = req.user.id;
        const { scores } = req.body;
        const result = await ScoringService.saveScores(episodeId, userId, scores);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('POST /api/episodes/:id/scoring/save error:', err);
        res.status(500).json({ error: 'Failed to save scores' });
    }
});
// GET /api/episodes/:id/scoring/status - Get scoring completeness status
router.get('/:id/scoring/status', requireAdmin, async (req, res) => {
    try {
        const episodeId = req.params.id;
        const result = await ScoringService.getScoringStatus(episodeId);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('GET /api/episodes/:id/scoring/status error:', err);
        res.status(500).json({ error: 'Failed to get scoring status' });
    }
});
// POST /api/episodes/:id/scoring/finalize - Finalize scores
router.post('/:id/scoring/finalize', requireAdmin, async (req, res) => {
    try {
        const episodeId = req.params.id;
        const userId = req.user.id;
        const result = await ScoringService.finalizeScoring(episodeId, userId);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('POST /api/episodes/:id/scoring/finalize error:', err);
        res.status(500).json({ error: 'Failed to finalize scoring' });
    }
});
// GET /api/episodes/:id/scores - Get all scores for episode
router.get('/:id/scores', authenticate, async (req, res) => {
    try {
        const episodeId = req.params.id;
        const result = await ScoringService.getEpisodeScores(episodeId);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('GET /api/episodes/:id/scores error:', err);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});
// GET /api/episodes/:id/scores/:castawayId - Get castaway's episode scores
router.get('/:id/scores/:castawayId', authenticate, async (req, res) => {
    try {
        const { id: episodeId, castawayId } = req.params;
        const result = await ScoringService.getCastawayScores(episodeId, castawayId);
        if (result.error) {
            return res.status(result.status || 500).json({ error: result.error });
        }
        res.json(result.data);
    }
    catch (err) {
        console.error('GET /api/episodes/:id/scores/:castawayId error:', err);
        res.status(500).json({ error: 'Failed to fetch castaway scores' });
    }
});
export default router;
//# sourceMappingURL=scoring.js.map