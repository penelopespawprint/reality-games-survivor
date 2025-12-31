/**
 * Scoring Recalculate Route
 *
 * Separate router for the recalculate endpoint to mount at /api/scoring
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import * as ScoringService from '../services/scoring.js';

const router = Router();

// POST /api/scoring/recalculate - Recalculate all standings (admin)
router.post('/recalculate', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id } = req.body;

    const result = await ScoringService.recalculateStandings(season_id);

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    res.json(result.data);
  } catch (err) {
    console.error('POST /api/scoring/recalculate error:', err);
    res.status(500).json({ error: 'Failed to recalculate standings' });
  }
});

export default router;
