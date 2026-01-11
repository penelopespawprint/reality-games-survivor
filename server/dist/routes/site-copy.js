/**
 * Site Copy API
 * Provides read and inline edit access to site copy for the frontend
 */
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
// Simple admin check middleware
async function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        // Check if user is admin
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
        if (profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    }
    catch {
        return res.status(401).json({ error: 'Authentication failed' });
    }
}
const router = Router();
// Cache for site copy (refresh every 10 seconds for instant CMS updates)
let copyCache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 1000; // 10 seconds - very short for instant updates
// Get all site copy (cached)
router.get('/', async (req, res) => {
    try {
        // Prevent browser caching
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        const now = Date.now();
        // Return cached if available
        if (copyCache && now - cacheTime < CACHE_TTL) {
            return res.json({ data: copyCache, cached: true });
        }
        // Fetch fresh data
        const { data, error } = await supabaseAdmin
            .from('site_copy')
            .select('key, content')
            .eq('is_active', true);
        if (error)
            throw error;
        // Convert to key-value map
        const copyMap = {};
        for (const item of data || []) {
            copyMap[item.key] = item.content;
        }
        // Update cache
        copyCache = copyMap;
        cacheTime = now;
        res.json({ data: copyMap, cached: false });
    }
    catch (err) {
        console.error('Failed to fetch site copy:', err);
        res.status(500).json({ error: 'Failed to fetch site copy' });
    }
});
// Get site copy by page
router.get('/page/:page', async (req, res) => {
    try {
        const { page } = req.params;
        const { data, error } = await supabaseAdmin
            .from('site_copy')
            .select('key, content, section')
            .eq('page', page)
            .eq('is_active', true);
        if (error)
            throw error;
        // Convert to key-value map
        const copyMap = {};
        for (const item of data || []) {
            copyMap[item.key] = item.content;
        }
        res.json({ data: copyMap });
    }
    catch (err) {
        console.error('Failed to fetch site copy by page:', err);
        res.status(500).json({ error: 'Failed to fetch site copy' });
    }
});
// Get single site copy item
router.get('/key/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { data, error } = await supabaseAdmin
            .from('site_copy')
            .select('content')
            .eq('key', key)
            .eq('is_active', true)
            .single();
        if (error) {
            return res.status(404).json({ error: 'Copy not found' });
        }
        res.json({ content: data.content });
    }
    catch (err) {
        console.error('Failed to fetch site copy item:', err);
        res.status(500).json({ error: 'Failed to fetch site copy' });
    }
});
// Clear cache (admin only - called after updates)
router.post('/clear-cache', async (req, res) => {
    copyCache = null;
    cacheTime = 0;
    res.json({ message: 'Cache cleared' });
});
// Update site copy inline (admin only)
router.post('/update', requireAdmin, async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || typeof value !== 'string') {
            return res.status(400).json({ error: 'Key and value are required' });
        }
        // Check if key exists
        const { data: existing } = await supabaseAdmin
            .from('site_copy')
            .select('id')
            .eq('key', key)
            .single();
        if (existing) {
            // Update existing
            const { error } = await supabaseAdmin
                .from('site_copy')
                .update({ content: value, updated_at: new Date().toISOString() })
                .eq('key', key);
            if (error)
                throw error;
        }
        else {
            // Create new entry - parse key to get page/section
            const parts = key.split('.');
            const page = parts[0] || 'general';
            const section = parts[1] || 'content';
            const { error } = await supabaseAdmin
                .from('site_copy')
                .insert({
                key,
                content: value,
                page,
                section,
                label: key,
                is_active: true,
            });
            if (error)
                throw error;
        }
        // Clear cache so changes are visible immediately
        copyCache = null;
        cacheTime = 0;
        res.json({ success: true, key, value });
    }
    catch (err) {
        console.error('Failed to update site copy:', err);
        res.status(500).json({ error: 'Failed to update site copy' });
    }
});
// Save section order for a page (admin only)
router.post('/section-order', requireAdmin, async (req, res) => {
    try {
        const { pageId, order } = req.body;
        if (!pageId || !Array.isArray(order)) {
            return res.status(400).json({ error: 'pageId and order array are required' });
        }
        // Store section order in a special site_copy entry
        const key = `_section_order.${pageId}`;
        const value = JSON.stringify(order);
        const { data: existing } = await supabaseAdmin
            .from('site_copy')
            .select('id')
            .eq('key', key)
            .single();
        if (existing) {
            const { error } = await supabaseAdmin
                .from('site_copy')
                .update({ content: value, updated_at: new Date().toISOString() })
                .eq('key', key);
            if (error)
                throw error;
        }
        else {
            const { error } = await supabaseAdmin
                .from('site_copy')
                .insert({
                key,
                content: value,
                page: '_system',
                section: 'section_order',
                label: `Section order for ${pageId}`,
                is_active: true,
            });
            if (error)
                throw error;
        }
        // Clear cache
        copyCache = null;
        cacheTime = 0;
        res.json({ success: true, pageId, order });
    }
    catch (err) {
        console.error('Failed to save section order:', err);
        res.status(500).json({ error: 'Failed to save section order' });
    }
});
// Get section order for a page
router.get('/section-order/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        const key = `_section_order.${pageId}`;
        const { data, error } = await supabaseAdmin
            .from('site_copy')
            .select('content')
            .eq('key', key)
            .single();
        if (error || !data) {
            return res.json({ order: null });
        }
        try {
            const order = JSON.parse(data.content);
            res.json({ order });
        }
        catch {
            res.json({ order: null });
        }
    }
    catch (err) {
        console.error('Failed to get section order:', err);
        res.status(500).json({ error: 'Failed to get section order' });
    }
});
// Export cache clearing function for direct use
export function clearSiteCopyCache() {
    copyCache = null;
    cacheTime = 0;
}
export default router;
//# sourceMappingURL=site-copy.js.map