/**
 * Admin Users Routes
 *
 * Routes for managing users (view, update roles).
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
const router = Router();
// GET /api/admin/users - View all users
router.get('/', async (req, res) => {
    try {
        const { role, search, limit = 50, offset = 0 } = req.query;
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
        res.json({ users, total: count });
    }
    catch (err) {
        console.error('GET /api/admin/users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
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
        res.json({ user });
    }
    catch (err) {
        console.error('PATCH /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
export default router;
//# sourceMappingURL=users.js.map