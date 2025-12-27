import { Router } from 'express';
import { verifyResultsToken } from '../lib/spoiler-safe-notifications.js';

const router = Router();

/**
 * GET /api/results/verify-token
 * Verify a results token from email link
 */
router.get('/verify-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    const result = await verifyResultsToken(token);

    res.json(result);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
