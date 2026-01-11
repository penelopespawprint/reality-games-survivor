/**
 * Admin Social Media API
 *
 * Manages social media posts via Buffer API integration.
 * Buffer supports: Twitter/X, Facebook, Instagram, LinkedIn, Pinterest, etc.
 *
 * Setup Required:
 * 1. Create a Buffer account and connect your social profiles
 * 2. Get an access token from Buffer's developer portal
 * 3. Set BUFFER_ACCESS_TOKEN in environment variables
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { z } from 'zod';
const router = Router();
// Buffer API base URL
const BUFFER_API_URL = 'https://api.bufferapp.com/1';
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN;
// ============================================
// BUFFER API HELPERS
// ============================================
async function bufferFetch(endpoint, options) {
    if (!BUFFER_ACCESS_TOKEN) {
        throw new Error('Buffer API is not configured. Set BUFFER_ACCESS_TOKEN environment variable.');
    }
    const url = `${BUFFER_API_URL}${endpoint}`;
    const separator = endpoint.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}access_token=${BUFFER_ACCESS_TOKEN}`;
    const response = await fetch(fullUrl, {
        ...options,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...options?.headers,
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Buffer API error: ${response.status}`);
    }
    return response.json();
}
// ============================================
// ROUTES
// ============================================
// Check if Buffer is configured
router.get('/status', async (req, res) => {
    try {
        if (!BUFFER_ACCESS_TOKEN) {
            return res.json({
                configured: false,
                message: 'Buffer API is not configured. Set BUFFER_ACCESS_TOKEN in environment.',
                setupUrl: 'https://buffer.com/developers/apps',
            });
        }
        // Verify token works
        const user = await bufferFetch('/user.json');
        res.json({
            configured: true,
            user: {
                name: user.name,
                plan: user.plan,
                email: user.email,
            },
        });
    }
    catch (err) {
        console.error('Buffer status check failed:', err);
        res.json({
            configured: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
});
// Get connected social profiles
router.get('/profiles', async (req, res) => {
    try {
        if (!BUFFER_ACCESS_TOKEN) {
            return res.status(503).json({
                error: 'Buffer API not configured',
                message: 'Set BUFFER_ACCESS_TOKEN environment variable',
            });
        }
        const profiles = await bufferFetch('/profiles.json');
        res.json({
            profiles: profiles.map((p) => ({
                id: p.id,
                service: p.service,
                username: p.service_username,
                formattedUsername: p.formatted_username,
                avatar: p.avatar,
                default: p.default,
                timezone: p.timezone,
                schedulingTimes: p.schedules,
            })),
        });
    }
    catch (err) {
        console.error('Failed to fetch Buffer profiles:', err);
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
});
// Get pending posts for a profile
router.get('/profiles/:profileId/pending', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { page = 1, count = 20 } = req.query;
        const result = await bufferFetch(`/profiles/${profileId}/updates/pending.json?page=${page}&count=${count}`);
        res.json({
            posts: result.updates || [],
            total: result.total || 0,
            page: Number(page),
        });
    }
    catch (err) {
        console.error('Failed to fetch pending posts:', err);
        res.status(500).json({ error: 'Failed to fetch pending posts' });
    }
});
// Get sent posts for a profile
router.get('/profiles/:profileId/sent', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { page = 1, count = 20 } = req.query;
        const result = await bufferFetch(`/profiles/${profileId}/updates/sent.json?page=${page}&count=${count}`);
        res.json({
            posts: result.updates || [],
            total: result.total || 0,
            page: Number(page),
        });
    }
    catch (err) {
        console.error('Failed to fetch sent posts:', err);
        res.status(500).json({ error: 'Failed to fetch sent posts' });
    }
});
// Create a new post
const createPostSchema = z.object({
    text: z.string().min(1).max(2048),
    profile_ids: z.array(z.string()).min(1),
    scheduled_at: z.string().datetime().optional(),
    now: z.boolean().optional(), // If true, post immediately
    media: z.object({
        photo: z.string().url().optional(),
        thumbnail: z.string().url().optional(),
    }).optional(),
});
router.post('/posts', async (req, res) => {
    try {
        const parsed = createPostSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
        }
        const { text, profile_ids, scheduled_at, now, media } = parsed.data;
        // Build form data for Buffer API
        const params = new URLSearchParams();
        params.append('text', text);
        profile_ids.forEach(id => params.append('profile_ids[]', id));
        if (scheduled_at) {
            params.append('scheduled_at', scheduled_at);
        }
        else if (now) {
            params.append('now', 'true');
        }
        if (media?.photo) {
            params.append('media[photo]', media.photo);
        }
        if (media?.thumbnail) {
            params.append('media[thumbnail]', media.thumbnail);
        }
        const result = await bufferFetch('/updates/create.json', {
            method: 'POST',
            body: params.toString(),
        });
        // Save to our database for tracking
        await supabaseAdmin.from('social_posts').insert({
            buffer_id: result.updates?.[0]?.id || null,
            profile_ids,
            text,
            scheduled_at: scheduled_at || (now ? new Date().toISOString() : null),
            status: now ? 'sent' : 'scheduled',
            created_by: req.user?.id,
            media: media || null,
        });
        res.status(201).json({
            success: result.success,
            message: result.message,
            updates: result.updates,
        });
    }
    catch (err) {
        console.error('Failed to create post:', err);
        res.status(500).json({ error: 'Failed to create post' });
    }
});
// Update a pending post
router.put('/posts/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { text, scheduled_at, media } = req.body;
        const params = new URLSearchParams();
        if (text)
            params.append('text', text);
        if (scheduled_at)
            params.append('scheduled_at', scheduled_at);
        if (media?.photo)
            params.append('media[photo]', media.photo);
        const result = await bufferFetch(`/updates/${postId}/update.json`, {
            method: 'POST',
            body: params.toString(),
        });
        res.json({
            success: result.success,
            update: result.update,
        });
    }
    catch (err) {
        console.error('Failed to update post:', err);
        res.status(500).json({ error: 'Failed to update post' });
    }
});
// Delete a pending post
router.delete('/posts/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const result = await bufferFetch(`/updates/${postId}/destroy.json`, {
            method: 'POST',
        });
        res.json({
            success: result.success,
        });
    }
    catch (err) {
        console.error('Failed to delete post:', err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});
// Share immediately (move from queue to immediate)
router.post('/posts/:postId/share', async (req, res) => {
    try {
        const { postId } = req.params;
        const result = await bufferFetch(`/updates/${postId}/share.json`, {
            method: 'POST',
        });
        res.json({
            success: result.success,
        });
    }
    catch (err) {
        console.error('Failed to share post:', err);
        res.status(500).json({ error: 'Failed to share post' });
    }
});
// Move post to top of queue
router.post('/posts/:postId/move-to-top', async (req, res) => {
    try {
        const { postId } = req.params;
        const result = await bufferFetch(`/updates/${postId}/move_to_top.json`, {
            method: 'POST',
        });
        res.json({
            success: result.success,
        });
    }
    catch (err) {
        console.error('Failed to move post:', err);
        res.status(500).json({ error: 'Failed to move post' });
    }
});
// Get post templates from our database
router.get('/templates', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('social_templates')
            .select('*')
            .order('category')
            .order('name');
        if (error)
            throw error;
        res.json({ templates: data || [] });
    }
    catch (err) {
        console.error('Failed to fetch templates:', err);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});
// Create a post template
router.post('/templates', async (req, res) => {
    try {
        const { name, category, text, media } = req.body;
        const { data, error } = await supabaseAdmin
            .from('social_templates')
            .insert({
            name,
            category,
            text,
            media,
            created_by: req.user?.id,
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ template: data });
    }
    catch (err) {
        console.error('Failed to create template:', err);
        res.status(500).json({ error: 'Failed to create template' });
    }
});
export default router;
//# sourceMappingURL=social.js.map