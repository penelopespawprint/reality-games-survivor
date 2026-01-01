/**
 * Admin Announcements Routes
 *
 * CRUD operations for managing announcements displayed on the dashboard.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
const router = Router();
/**
 * GET /admin/announcements
 * List all announcements with view/dismissal stats
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        // Get view and dismissal counts for each announcement
        const announcementsWithStats = await Promise.all((data || []).map(async (announcement) => {
            const { count: viewCount } = await supabaseAdmin
                .from('announcement_views')
                .select('*', { count: 'exact', head: true })
                .eq('announcement_id', announcement.id);
            const { count: dismissCount } = await supabaseAdmin
                .from('announcement_dismissals')
                .select('*', { count: 'exact', head: true })
                .eq('announcement_id', announcement.id);
            return {
                ...announcement,
                view_count: viewCount || 0,
                dismiss_count: dismissCount || 0,
            };
        }));
        // Categorize announcements
        const now = new Date();
        const active = announcementsWithStats.filter((a) => a.is_active && (!a.expires_at || new Date(a.expires_at) > now));
        const scheduled = announcementsWithStats.filter((a) => a.scheduled_at && new Date(a.scheduled_at) > now);
        const archived = announcementsWithStats.filter((a) => !a.is_active || (a.expires_at && new Date(a.expires_at) <= now));
        res.json({
            announcements: announcementsWithStats,
            active,
            scheduled,
            archived,
            total: data?.length || 0,
        });
    }
    catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});
/**
 * GET /admin/announcements/:id
 * Get a single announcement by ID with stats
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            throw error;
        }
        // Get view and dismissal counts
        const { count: viewCount } = await supabaseAdmin
            .from('announcement_views')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', id);
        const { count: dismissCount } = await supabaseAdmin
            .from('announcement_dismissals')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', id);
        res.json({
            ...data,
            view_count: viewCount || 0,
            dismiss_count: dismissCount || 0,
        });
    }
    catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({ error: 'Failed to fetch announcement' });
    }
});
/**
 * POST /admin/announcements
 * Create a new announcement
 */
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const userId = req.user?.id;
        // Validate required fields
        if (!body.title || !body.content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        // Validate priority if provided
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (body.priority && !validPriorities.includes(body.priority)) {
            return res.status(400).json({ error: 'Invalid priority. Must be: low, medium, high, or urgent' });
        }
        const { data, error } = await supabaseAdmin
            .from('announcements')
            .insert({
            title: body.title,
            content: body.content,
            priority: body.priority || 'medium',
            is_active: body.is_active !== false, // Default to true
            expires_at: body.expires_at || null,
            created_by: userId,
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({
            message: 'Announcement created successfully',
            announcement: data,
        });
    }
    catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});
/**
 * PATCH /admin/announcements/:id
 * Update an existing announcement
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        // Validate priority if provided
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (body.priority && !validPriorities.includes(body.priority)) {
            return res.status(400).json({ error: 'Invalid priority. Must be: low, medium, high, or urgent' });
        }
        // Build update object with only provided fields
        const updateData = {};
        if (body.title !== undefined)
            updateData.title = body.title;
        if (body.content !== undefined)
            updateData.content = body.content;
        if (body.priority !== undefined)
            updateData.priority = body.priority;
        if (body.is_active !== undefined)
            updateData.is_active = body.is_active;
        if (body.expires_at !== undefined)
            updateData.expires_at = body.expires_at;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        const { data, error } = await supabaseAdmin
            .from('announcements')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            throw error;
        }
        res.json({
            message: 'Announcement updated successfully',
            announcement: data,
        });
    }
    catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});
/**
 * DELETE /admin/announcements/:id
 * Delete an announcement
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('announcements')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        res.json({ message: 'Announcement deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});
/**
 * POST /admin/announcements/:id/toggle
 * Quick toggle for is_active status
 */
router.post('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        // Get current status
        const { data: current, error: fetchError } = await supabaseAdmin
            .from('announcements')
            .select('is_active')
            .eq('id', id)
            .single();
        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            throw fetchError;
        }
        // Toggle status
        const { data, error } = await supabaseAdmin
            .from('announcements')
            .update({ is_active: !current.is_active })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            message: `Announcement ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            announcement: data,
        });
    }
    catch (error) {
        console.error('Error toggling announcement:', error);
        res.status(500).json({ error: 'Failed to toggle announcement' });
    }
});
export default router;
//# sourceMappingURL=announcements.js.map