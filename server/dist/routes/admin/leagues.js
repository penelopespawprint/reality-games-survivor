/**
 * Admin Leagues Routes
 *
 * Routes for viewing and managing leagues with enhanced analytics.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
const router = Router();
// GET /api/admin/leagues - View all leagues with enhanced data
router.get('/', async (req, res) => {
    try {
        const { season_id, status, type, search, sort = 'created', limit = 50, offset = 0 } = req.query;
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
            .range(Number(offset), Number(offset) + Number(limit) - 1);
        // Apply sorting
        switch (sort) {
            case 'name':
                query = query.order('name', { ascending: true });
                break;
            case 'members':
                // Will sort after fetching
                query = query.order('created_at', { ascending: false });
                break;
            case 'revenue':
                // Will sort after fetching
                query = query.order('created_at', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }
        if (season_id) {
            query = query.eq('season_id', season_id);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (type === 'paid') {
            query = query.gt('entry_fee', 0);
        }
        else if (type === 'free') {
            query = query.eq('entry_fee', 0);
        }
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        const { data: leagues, error, count } = await query;
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Enhance leagues with member counts, pick stats, and revenue
        const enhancedLeagues = await Promise.all((leagues || []).map(async (league) => {
            // Get member count
            const { count: memberCount } = await supabaseAdmin
                .from('league_members')
                .select('*', { count: 'exact', head: true })
                .eq('league_id', league.id);
            // Get pick stats for current episode
            const { data: currentEpisode } = await supabaseAdmin
                .from('episodes')
                .select('id')
                .eq('season_id', league.season_id)
                .lte('air_date', new Date().toISOString())
                .order('air_date', { ascending: false })
                .limit(1)
                .single();
            let pickStats = { submitted: 0, total: memberCount || 0, percentage: 0 };
            if (currentEpisode) {
                const { count: pickCount } = await supabaseAdmin
                    .from('weekly_picks')
                    .select('*', { count: 'exact', head: true })
                    .eq('league_id', league.id)
                    .eq('episode_id', currentEpisode.id);
                pickStats.submitted = pickCount || 0;
                pickStats.percentage = pickStats.total > 0
                    ? Math.round((pickStats.submitted / pickStats.total) * 100)
                    : 0;
            }
            // Get revenue for paid leagues
            let revenue = { gross: 0, net: 0 };
            if (league.entry_fee > 0) {
                const { data: donations } = await supabaseAdmin
                    .from('donations')
                    .select('gross_amount, net_to_league')
                    .eq('league_id', league.id)
                    .eq('status', 'completed');
                if (donations) {
                    revenue.gross = donations.reduce((sum, d) => sum + (d.gross_amount || 0), 0);
                    revenue.net = donations.reduce((sum, d) => sum + (d.net_to_league || 0), 0);
                }
            }
            return {
                ...league,
                member_count: memberCount || 0,
                pick_stats: pickStats,
                revenue,
            };
        }));
        // Sort by members or revenue if needed
        let sortedLeagues = enhancedLeagues;
        if (sort === 'members') {
            sortedLeagues = enhancedLeagues.sort((a, b) => b.member_count - a.member_count);
        }
        else if (sort === 'revenue') {
            sortedLeagues = enhancedLeagues.sort((a, b) => b.revenue.gross - a.revenue.gross);
        }
        res.json({ leagues: sortedLeagues, total: count });
    }
    catch (err) {
        console.error('GET /api/admin/leagues error:', err);
        res.status(500).json({ error: 'Failed to fetch leagues' });
    }
});
// GET /api/admin/leagues/:id - Get detailed league info
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Get league with commissioner info
        const { data: league, error } = await supabaseAdmin
            .from('leagues')
            .select(`
        *,
        seasons (id, name, number),
        users:commissioner_id (id, display_name, email)
      `)
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ error: 'League not found' });
        }
        // Get members with stats
        const { data: members } = await supabaseAdmin
            .from('league_members')
            .select(`
        *,
        users:user_id (id, display_name, email, avatar_url)
      `)
            .eq('league_id', id)
            .order('joined_at', { ascending: true });
        // Get member pick counts and points
        const membersWithStats = await Promise.all((members || []).map(async (member) => {
            const { count: pickCount } = await supabaseAdmin
                .from('weekly_picks')
                .select('*', { count: 'exact', head: true })
                .eq('league_id', id)
                .eq('user_id', member.user_id);
            const { data: leaderboardEntry } = await supabaseAdmin
                .from('leaderboard_entries')
                .select('total_points, rank')
                .eq('league_id', id)
                .eq('user_id', member.user_id)
                .single();
            return {
                ...member,
                pick_count: pickCount || 0,
                total_points: leaderboardEntry?.total_points || 0,
                rank: leaderboardEntry?.rank || null,
            };
        }));
        // Get donations
        const { data: donations } = await supabaseAdmin
            .from('donations')
            .select(`
        *,
        users:user_id (id, display_name, email)
      `)
            .eq('league_id', id)
            .order('created_at', { ascending: false });
        // Calculate revenue summary
        const completedDonations = (donations || []).filter(d => d.status === 'completed');
        const revenueSummary = {
            gross: completedDonations.reduce((sum, d) => sum + (d.gross_amount || 0), 0),
            stripeFee: completedDonations.reduce((sum, d) => sum + (d.stripe_fee || 0), 0),
            rgflFee: completedDonations.reduce((sum, d) => sum + (d.rgfl_fee || 0), 0),
            net: completedDonations.reduce((sum, d) => sum + (d.net_to_league || 0), 0),
            count: completedDonations.length,
        };
        res.json({
            league,
            members: membersWithStats,
            donations: donations || [],
            revenueSummary,
        });
    }
    catch (err) {
        console.error('GET /api/admin/leagues/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch league' });
    }
});
// GET /api/admin/leagues/:id/members - Get league members
router.get('/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: members, error } = await supabaseAdmin
            .from('league_members')
            .select(`
        *,
        users:user_id (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
            .eq('league_id', id)
            .order('joined_at', { ascending: true });
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ members: members || [] });
    }
    catch (err) {
        console.error('GET /api/admin/leagues/:id/members error:', err);
        res.status(500).json({ error: 'Failed to fetch league members' });
    }
});
// PUT /api/admin/leagues/:id - Update league settings
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, is_public, entry_fee, max_members, status } = req.body;
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (is_public !== undefined)
            updates.is_public = is_public;
        if (entry_fee !== undefined)
            updates.entry_fee = entry_fee;
        if (max_members !== undefined)
            updates.max_members = max_members;
        if (status !== undefined)
            updates.status = status;
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        const { data: league, error } = await supabaseAdmin
            .from('leagues')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'league_update',
            p_actor_id: req.user?.id,
            p_target_type: 'league',
            p_target_id: id,
            p_metadata: { updates },
        });
        res.json({ league });
    }
    catch (err) {
        console.error('PUT /api/admin/leagues/:id error:', err);
        res.status(500).json({ error: 'Failed to update league' });
    }
});
// POST /api/admin/leagues/:id/transfer - Transfer commissioner
router.post('/:id/transfer', async (req, res) => {
    try {
        const { id } = req.params;
        const { new_commissioner_id } = req.body;
        if (!new_commissioner_id) {
            return res.status(400).json({ error: 'new_commissioner_id is required' });
        }
        // Verify new commissioner is a member
        const { data: membership } = await supabaseAdmin
            .from('league_members')
            .select('id')
            .eq('league_id', id)
            .eq('user_id', new_commissioner_id)
            .single();
        if (!membership) {
            return res.status(400).json({ error: 'New commissioner must be a league member' });
        }
        // Get current commissioner for logging
        const { data: currentLeague } = await supabaseAdmin
            .from('leagues')
            .select('commissioner_id')
            .eq('id', id)
            .single();
        // Update commissioner
        const { data: league, error } = await supabaseAdmin
            .from('leagues')
            .update({ commissioner_id: new_commissioner_id })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'league_transfer',
            p_actor_id: req.user?.id,
            p_target_type: 'league',
            p_target_id: id,
            p_metadata: {
                old_commissioner: currentLeague?.commissioner_id,
                new_commissioner: new_commissioner_id,
            },
        });
        res.json({ league });
    }
    catch (err) {
        console.error('POST /api/admin/leagues/:id/transfer error:', err);
        res.status(500).json({ error: 'Failed to transfer commissioner' });
    }
});
// DELETE /api/admin/leagues/:id/members/:userId - Remove member from league
router.delete('/:id/members/:userId', async (req, res) => {
    try {
        const { id: leagueId, userId } = req.params;
        // Check if user is the commissioner
        const { data: league } = await supabaseAdmin
            .from('leagues')
            .select('commissioner_id')
            .eq('id', leagueId)
            .single();
        if (league?.commissioner_id === userId) {
            return res.status(400).json({ error: 'Cannot remove the commissioner from their own league' });
        }
        // Remove member
        const { error: memberError } = await supabaseAdmin
            .from('league_members')
            .delete()
            .eq('league_id', leagueId)
            .eq('user_id', userId);
        if (memberError) {
            return res.status(400).json({ error: memberError.message });
        }
        // Also remove their rosters
        const { error: rosterError } = await supabaseAdmin
            .from('rosters')
            .delete()
            .eq('league_id', leagueId)
            .eq('user_id', userId);
        if (rosterError) {
            console.error('Error removing rosters:', rosterError);
        }
        // Also remove their weekly picks
        const { error: picksError } = await supabaseAdmin
            .from('weekly_picks')
            .delete()
            .eq('league_id', leagueId)
            .eq('user_id', userId);
        if (picksError) {
            console.error('Error removing weekly picks:', picksError);
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'league_member_remove',
            p_actor_id: req.user?.id,
            p_target_type: 'league',
            p_target_id: leagueId,
            p_metadata: { removed_user_id: userId },
        });
        res.json({ success: true, message: 'Member removed from league' });
    }
    catch (err) {
        console.error('DELETE /api/admin/leagues/:id/members/:userId error:', err);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});
// DELETE /api/admin/leagues/:id - Delete league
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Get league info for logging
        const { data: league } = await supabaseAdmin
            .from('leagues')
            .select('name, commissioner_id')
            .eq('id', id)
            .single();
        // Delete league (cascade should handle related records)
        const { error } = await supabaseAdmin
            .from('leagues')
            .delete()
            .eq('id', id);
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'league_delete',
            p_actor_id: req.user?.id,
            p_target_type: 'league',
            p_target_id: id,
            p_metadata: { deleted_name: league?.name },
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('DELETE /api/admin/leagues/:id error:', err);
        res.status(500).json({ error: 'Failed to delete league' });
    }
});
// POST /api/admin/leagues/:id/message - Send message to commissioner
router.post('/:id/message', async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, body } = req.body;
        if (!subject || !body) {
            return res.status(400).json({ error: 'Subject and body are required' });
        }
        // Get commissioner email
        const { data: league } = await supabaseAdmin
            .from('leagues')
            .select(`
        name,
        users:commissioner_id (email, display_name)
      `)
            .eq('id', id)
            .single();
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        // users is an array from the join, get the first element
        const commissioner = Array.isArray(league.users) ? league.users[0] : league.users;
        if (!commissioner?.email) {
            return res.status(404).json({ error: 'Commissioner not found' });
        }
        // Queue email
        const { error: emailError } = await supabaseAdmin
            .from('email_queue')
            .insert({
            to_email: commissioner.email,
            subject,
            body,
            template_name: 'admin_message',
            metadata: { league_id: id, league_name: league.name },
        });
        if (emailError) {
            return res.status(500).json({ error: 'Failed to queue email' });
        }
        res.json({ success: true, message: 'Message queued for delivery' });
    }
    catch (err) {
        console.error('POST /api/admin/leagues/:id/message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
export default router;
//# sourceMappingURL=leagues.js.map