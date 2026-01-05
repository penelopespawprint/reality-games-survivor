/**
 * Admin Users Routes
 *
 * Routes for managing users (view, update roles, impersonate, segments).
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
const router = Router();
// GET /api/admin/users - View all users with enhanced data
router.get('/', async (req, res) => {
    try {
        const { role, search, segment, status, limit = 50, offset = 0 } = req.query;
        let query = supabaseAdmin
            .from('users')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);
        if (role) {
            query = query.eq('role', role);
        }
        if (search) {
            query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        const { data: users, error, count } = await query;
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Enhance users with segment and health data
        const enhancedUsers = await Promise.all((users || []).map(async (user) => {
            // Get segment
            const { data: segmentData } = await supabaseAdmin.rpc('get_user_segment', { user_uuid: user.id });
            // Get health
            const { data: healthData } = await supabaseAdmin.rpc('get_user_health', { user_uuid: user.id });
            // Get league count
            const { count: leagueCount } = await supabaseAdmin
                .from('league_members')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);
            // Get pick count
            const { count: pickCount } = await supabaseAdmin
                .from('weekly_picks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);
            return {
                ...user,
                segment: segmentData || 'new',
                health: healthData || 'healthy',
                league_count: leagueCount || 0,
                pick_count: pickCount || 0,
            };
        }));
        // Filter by segment if specified
        let filteredUsers = enhancedUsers;
        if (segment) {
            filteredUsers = enhancedUsers.filter(u => u.segment === segment);
        }
        if (status) {
            filteredUsers = filteredUsers.filter(u => u.health === status);
        }
        res.json({ users: filteredUsers, total: count });
    }
    catch (err) {
        console.error('GET /api/admin/users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// GET /api/admin/users/:id - Get detailed user info
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        // Get user
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get segment and health
        const { data: segment } = await supabaseAdmin.rpc('get_user_segment', { user_uuid: userId });
        const { data: health } = await supabaseAdmin.rpc('get_user_health', { user_uuid: userId });
        // Get leagues
        const { data: leagues } = await supabaseAdmin
            .from('league_members')
            .select(`
        league_id,
        joined_at,
        leagues:league_id (
          id,
          name,
          code,
          is_public,
          entry_fee
        )
      `)
            .eq('user_id', userId);
        // Get pick stats
        const { data: picks } = await supabaseAdmin
            .from('weekly_picks')
            .select('id, episode_id, status')
            .eq('user_id', userId);
        // Get total points from league_members
        const { data: pointsData } = await supabaseAdmin
            .from('league_members')
            .select('total_points')
            .eq('user_id', userId);
        // Sum up total_points across all leagues
        const totalPoints = (pointsData || []).reduce((sum, m) => sum + (m.total_points || 0), 0);
        // Get donations
        const { data: donations } = await supabaseAdmin
            .from('donations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        // Get notification preferences
        const { data: notificationPrefs } = await supabaseAdmin
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
        res.json({
            user: {
                ...user,
                segment: segment || 'new',
                health: health || 'healthy',
            },
            engagement: {
                leagues: leagues || [],
                leagueCount: leagues?.length || 0,
                picks: picks || [],
                pickCount: picks?.length || 0,
                totalPoints: totalPoints,
            },
            notifications: notificationPrefs || {},
            donations: donations || [],
            totalDonated: donations?.reduce((sum, d) => sum + (d.gross_amount || 0), 0) || 0,
        });
    }
    catch (err) {
        console.error('GET /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
// PATCH /api/admin/users/:id - Update user (role and profile fields)
router.patch('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { role, display_name, email, phone, hometown, favorite_castaway, timezone } = req.body;
        // Build update object with only provided fields
        const updates = {};
        // Validate and add role if provided
        if (role !== undefined) {
            if (!['player', 'commissioner', 'admin'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role. Must be player, commissioner, or admin.' });
            }
            updates.role = role;
        }
        // Add other profile fields if provided
        if (display_name !== undefined)
            updates.display_name = display_name;
        if (email !== undefined)
            updates.email = email;
        if (phone !== undefined)
            updates.phone = phone;
        if (hometown !== undefined)
            updates.hometown = hometown;
        if (favorite_castaway !== undefined)
            updates.favorite_castaway = favorite_castaway;
        if (timezone !== undefined)
            updates.timezone = timezone;
        // Ensure at least one field is being updated
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'user_update',
            p_actor_id: req.user?.id,
            p_target_type: 'user',
            p_target_id: userId,
            p_metadata: { updates },
        });
        res.json({ user });
    }
    catch (err) {
        console.error('PATCH /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// POST /api/admin/users/:id/impersonate - Generate impersonation token
router.post('/:id/impersonate', async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user?.id;
        // Verify target user exists
        const { data: targetUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, display_name')
            .eq('id', userId)
            .single();
        if (userError || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Log the impersonation action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'user_impersonate',
            p_actor_id: adminId,
            p_target_type: 'user',
            p_target_id: userId,
            p_metadata: { target_email: targetUser.email },
        });
        // Generate a magic link for the target user
        const { data: magicLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: targetUser.email,
        });
        if (linkError) {
            console.error('Error generating magic link:', linkError);
            return res.status(500).json({ error: 'Failed to generate impersonation link' });
        }
        // Return the link with a read-only indicator
        res.json({
            success: true,
            impersonationUrl: magicLink.properties?.action_link,
            targetUser: {
                id: targetUser.id,
                email: targetUser.email,
                display_name: targetUser.display_name,
            },
            note: 'This link will log you in as this user. Use with caution.',
        });
    }
    catch (err) {
        console.error('POST /api/admin/users/:id/impersonate error:', err);
        res.status(500).json({ error: 'Failed to create impersonation session' });
    }
});
// POST /api/admin/users/:id/reset-password - Send password reset email
router.post('/:id/reset-password', async (req, res) => {
    try {
        const userId = req.params.id;
        // Get user email
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();
        if (userError || !user?.email) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Generate password reset link
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: user.email,
        });
        if (resetError) {
            return res.status(500).json({ error: 'Failed to generate reset link' });
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'user_password_reset',
            p_actor_id: req.user?.id,
            p_target_type: 'user',
            p_target_id: userId,
        });
        res.json({ success: true, message: 'Password reset email sent' });
    }
    catch (err) {
        console.error('POST /api/admin/users/:id/reset-password error:', err);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});
// POST /api/admin/users/:id/suspend - Suspend user account
router.post('/:id/suspend', async (req, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body;
        // Update user status
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspension_reason: reason,
        })
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'user_suspend',
            p_actor_id: req.user?.id,
            p_target_type: 'user',
            p_target_id: userId,
            p_metadata: { reason },
        });
        res.json({ user });
    }
    catch (err) {
        console.error('POST /api/admin/users/:id/suspend error:', err);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
});
// DELETE /api/admin/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        // Get user info for logging
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('email, display_name')
            .eq('id', userId)
            .single();
        // Delete from auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
            console.error('Error deleting auth user:', authError);
        }
        // Delete from users table (cascade should handle related records)
        const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId);
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Log the action
        await supabaseAdmin.rpc('log_admin_action', {
            p_action: 'user_delete',
            p_actor_id: req.user?.id,
            p_target_type: 'user',
            p_target_id: userId,
            p_metadata: { deleted_email: user?.email, deleted_name: user?.display_name },
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('DELETE /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// GET /api/admin/users/segments/stats - Get segment statistics
router.get('/segments/stats', async (req, res) => {
    try {
        // Get all users
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id');
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Count by segment
        const segments = { power: 0, casual: 0, dormant: 0, churned: 0, new: 0 };
        for (const user of users || []) {
            const { data: segment } = await supabaseAdmin.rpc('get_user_segment', { user_uuid: user.id });
            if (segment && segments[segment] !== undefined) {
                segments[segment]++;
            }
        }
        res.json({ segments, total: users?.length || 0 });
    }
    catch (err) {
        console.error('GET /api/admin/users/segments/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch segment stats' });
    }
});
export default router;
//# sourceMappingURL=users.js.map