/**
 * Admin Leagues Routes
 *
 * Routes for viewing and managing leagues.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
const router = Router();
// GET /api/admin/leagues - View all leagues
router.get('/', async (req, res) => {
    try {
        const { season_id, status, search, limit = 50, offset = 0 } = req.query;
        let query = supabaseAdmin
            .from('leagues')
            .select(`
        *,
        seasons (
          id,
          name,
          number
        ),
        users:commissioner_id (
          id,
          display_name,
          email
        )
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);
        if (season_id) {
            query = query.eq('season_id', season_id);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        const { data: leagues, error, count } = await query;
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Get member counts for each league
        const leaguesWithCounts = await Promise.all((leagues || []).map(async (league) => {
            const { count: memberCount } = await supabaseAdmin
                .from('league_members')
                .select('*', { count: 'exact', head: true })
                .eq('league_id', league.id);
            return {
                ...league,
                member_count: memberCount || 0,
            };
        }));
        res.json({ leagues: leaguesWithCounts, total: count });
    }
    catch (err) {
        console.error('GET /api/admin/leagues error:', err);
        res.status(500).json({ error: 'Failed to fetch leagues' });
    }
});
export default router;
//# sourceMappingURL=leagues.js.map