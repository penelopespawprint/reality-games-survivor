/**
 * Public Site Copy API
 * Provides read-only access to site copy for the frontend
 */

import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// Cache for site copy (refresh every 30 seconds for faster CMS updates)
let copyCache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds - short for dev, can increase in prod

// Get all site copy (cached)
router.get('/', async (req, res) => {
  try {
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

    if (error) throw error;

    // Convert to key-value map
    const copyMap: Record<string, string> = {};
    for (const item of data || []) {
      copyMap[item.key] = item.content;
    }

    // Update cache
    copyCache = copyMap;
    cacheTime = now;

    res.json({ data: copyMap, cached: false });
  } catch (err) {
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

    if (error) throw error;

    // Convert to key-value map
    const copyMap: Record<string, string> = {};
    for (const item of data || []) {
      copyMap[item.key] = item.content;
    }

    res.json({ data: copyMap });
  } catch (err) {
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
  } catch (err) {
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

// Export cache clearing function for direct use
export function clearSiteCopyCache(): void {
  copyCache = null;
  cacheTime = 0;
}

export default router;
