/**
 * Admin Content Management API
 * Handles email templates and site copy CRUD operations
 */

import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { z } from 'zod';

const router = Router();

// ============================================
// EMAIL TEMPLATES
// ============================================

// List all email templates
router.get('/email-templates', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = supabaseAdmin
      .from('email_templates')
      .select('*')
      .order('category')
      .order('name');
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch email templates:', err);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Get single email template
router.get('/email-templates/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch email template:', err);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

// Update email template
const updateTemplateSchema = z.object({
  subject: z.string().min(1).max(500),
  html_body: z.string().min(1),
  text_body: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  description: z.string().optional(),
});

router.put('/email-templates/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = (req as any).user?.id;

    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .update({
        ...parsed.data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
      .select()
      .single();

    if (error) throw error;

    // Clear cache for this template
    const { clearTemplateCache } = await import('../../emails/templateLoader.js');
    clearTemplateCache(slug);

    res.json({ data, message: 'Template updated successfully' });
  } catch (err) {
    console.error('Failed to update email template:', err);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// Create new email template
const createTemplateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['transactional', 'marketing', 'lifecycle']),
  subject: z.string().min(1).max(500),
  html_body: z.string().min(1),
  text_body: z.string().optional().nullable(),
  available_variables: z.array(z.string()).optional(),
  trigger_type: z.enum(['immediate', 'scheduled', 'event']).optional(),
});

router.post('/email-templates', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }
    
    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .insert({
        ...parsed.data,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Template with this slug already exists' });
      }
      throw error;
    }
    
    res.status(201).json({ data, message: 'Template created successfully' });
  } catch (err) {
    console.error('Failed to create email template:', err);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// Delete email template (only non-system templates)
router.delete('/email-templates/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if it's a system template
    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('is_system')
      .eq('slug', slug)
      .single();

    if (template?.is_system) {
      return res.status(403).json({ error: 'Cannot delete system templates' });
    }

    const { error } = await supabaseAdmin
      .from('email_templates')
      .delete()
      .eq('slug', slug);

    if (error) throw error;

    // Clear cache for this template
    const { clearTemplateCache } = await import('../../emails/templateLoader.js');
    clearTemplateCache(slug);

    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('Failed to delete email template:', err);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

// Get template version history
router.get('/email-templates/:slug/versions', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // First get the template ID
    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('email_template_versions')
      .select('*, users:changed_by(display_name, email)')
      .eq('template_id', template.id)
      .order('version', { ascending: false });
    
    if (error) throw error;
    
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch template versions:', err);
    res.status(500).json({ error: 'Failed to fetch template versions' });
  }
});

// Preview email template with sample data
router.post('/email-templates/:slug/preview', async (req, res) => {
  try {
    const { slug } = req.params;
    const { variables } = req.body;
    
    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('subject, html_body')
      .eq('slug', slug)
      .single();
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Simple variable replacement
    let subject = template.subject;
    let html = template.html_body;
    
    if (variables && typeof variables === 'object') {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        html = html.replace(regex, String(value));
      }
    }
    
    res.json({ subject, html });
  } catch (err) {
    console.error('Failed to preview template:', err);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// Send test email
router.post('/email-templates/:slug/send-test', async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, variables } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }
    
    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('subject, html_body')
      .eq('slug', slug)
      .single();
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Variable replacement
    let subject = `[TEST] ${template.subject}`;
    let html = template.html_body;
    
    if (variables && typeof variables === 'object') {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        html = html.replace(regex, String(value));
      }
    }
    
    // Import and use email sender
    const { sendEmail } = await import('../../config/email.js');
    const success = await sendEmail({ to: email, subject, html });
    
    if (success) {
      res.json({ message: `Test email sent to ${email}` });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (err) {
    console.error('Failed to send test email:', err);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// ============================================
// SITE COPY
// ============================================

// List all site copy
router.get('/site-copy', async (req, res) => {
  try {
    const { page } = req.query;
    
    let query = supabaseAdmin
      .from('site_copy')
      .select('*')
      .order('page')
      .order('section')
      .order('key');
    
    if (page && page !== 'all') {
      query = query.eq('page', page);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Group by page for easier UI consumption
    const grouped = data?.reduce((acc: Record<string, any[]>, item) => {
      if (!acc[item.page]) acc[item.page] = [];
      acc[item.page].push(item);
      return acc;
    }, {});
    
    res.json({ data, grouped });
  } catch (err) {
    console.error('Failed to fetch site copy:', err);
    res.status(500).json({ error: 'Failed to fetch site copy' });
  }
});

// Get single site copy item
router.get('/site-copy/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('site_copy')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Copy not found' });
    }
    
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch site copy:', err);
    res.status(500).json({ error: 'Failed to fetch site copy' });
  }
});

// Update site copy (with auto-create if doesn't exist)
const updateCopySchema = z.object({
  content: z.string().min(1),
  is_active: z.boolean().optional(),
  description: z.string().optional(),
  page: z.string().optional(),
  section: z.string().optional(),
});

router.put('/site-copy/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const userId = (req as any).user?.id;

    const parsed = updateCopySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    // Try to update first
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('site_copy')
      .update({
        content: parsed.data.content,
        is_active: parsed.data.is_active,
        description: parsed.data.description,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single();

    // If record doesn't exist, create it
    if (updateError && updateError.code === 'PGRST116') {
      // Extract page from key (e.g., "page.section.field" -> "page")
      const pageName = parsed.data.page || key.split('.')[0] || 'general';
      const sectionName = parsed.data.section || key.split('.')[1] || null;

      const { data: createData, error: createError } = await supabaseAdmin
        .from('site_copy')
        .insert({
          key,
          page: pageName,
          section: sectionName,
          content: parsed.data.content,
          content_type: 'text',
          is_active: parsed.data.is_active ?? true,
          description: parsed.data.description,
          updated_by: userId,
        })
        .select()
        .single();

      if (createError) throw createError;
      return res.json({ data: createData, message: 'Copy created successfully', created: true });
    }

    if (updateError) throw updateError;

    res.json({ data: updateData, message: 'Copy updated successfully' });
  } catch (err) {
    console.error('Failed to update site copy:', err);
    res.status(500).json({ error: 'Failed to update site copy' });
  }
});

// Create new site copy
const createCopySchema = z.object({
  key: z.string().min(1).max(200),
  page: z.string().min(1).max(100),
  section: z.string().max(100).optional(),
  content_type: z.enum(['text', 'html', 'markdown']).optional(),
  content: z.string().min(1),
  description: z.string().optional(),
  max_length: z.number().optional(),
});

router.post('/site-copy', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    const parsed = createCopySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }
    
    const { data, error } = await supabaseAdmin
      .from('site_copy')
      .insert({
        ...parsed.data,
        updated_by: userId,
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Copy with this key already exists' });
      }
      throw error;
    }
    
    res.status(201).json({ data, message: 'Copy created successfully' });
  } catch (err) {
    console.error('Failed to create site copy:', err);
    res.status(500).json({ error: 'Failed to create site copy' });
  }
});

// Delete site copy
router.delete('/site-copy/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const { error } = await supabaseAdmin
      .from('site_copy')
      .delete()
      .eq('key', key);
    
    if (error) throw error;
    
    res.json({ message: 'Copy deleted successfully' });
  } catch (err) {
    console.error('Failed to delete site copy:', err);
    res.status(500).json({ error: 'Failed to delete site copy' });
  }
});

// Get copy version history
router.get('/site-copy/:key/versions', async (req, res) => {
  try {
    const { key } = req.params;
    
    const { data: copy } = await supabaseAdmin
      .from('site_copy')
      .select('id')
      .eq('key', key)
      .single();
    
    if (!copy) {
      return res.status(404).json({ error: 'Copy not found' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('site_copy_versions')
      .select('*, users:changed_by(display_name, email)')
      .eq('copy_id', copy.id)
      .order('version', { ascending: false });
    
    if (error) throw error;
    
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch copy versions:', err);
    res.status(500).json({ error: 'Failed to fetch copy versions' });
  }
});

// Bulk update site copy (for batch editing)
router.post('/site-copy/bulk-update', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }
    
    const results = [];
    for (const update of updates) {
      if (!update.key || !update.content) continue;
      
      const { data, error } = await supabaseAdmin
        .from('site_copy')
        .update({
          content: update.content,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('key', update.key)
        .select()
        .single();
      
      if (error) {
        results.push({ key: update.key, success: false, error: error.message });
      } else {
        results.push({ key: update.key, success: true });
      }
    }
    
    res.json({ results, message: `Updated ${results.filter(r => r.success).length} items` });
  } catch (err) {
    console.error('Failed to bulk update site copy:', err);
    res.status(500).json({ error: 'Failed to bulk update site copy' });
  }
});

// ============================================
// STATS
// ============================================

router.get('/content-stats', async (req, res) => {
  try {
    const [templates, copy] = await Promise.all([
      supabaseAdmin
        .from('email_templates')
        .select('category, is_active', { count: 'exact' }),
      supabaseAdmin
        .from('site_copy')
        .select('page, is_active', { count: 'exact' }),
    ]);
    
    const templatesByCategory = templates.data?.reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});
    
    const copyByPage = copy.data?.reduce((acc: Record<string, number>, c) => {
      acc[c.page] = (acc[c.page] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      emailTemplates: {
        total: templates.data?.length || 0,
        active: templates.data?.filter(t => t.is_active).length || 0,
        byCategory: templatesByCategory,
      },
      siteCopy: {
        total: copy.data?.length || 0,
        active: copy.data?.filter(c => c.is_active).length || 0,
        byPage: copyByPage,
      },
    });
  } catch (err) {
    console.error('Failed to fetch content stats:', err);
    res.status(500).json({ error: 'Failed to fetch content stats' });
  }
});

// ============================================
// CACHE MANAGEMENT
// ============================================

// Clear template and site copy cache
router.post('/clear-cache', async (req, res) => {
  try {
    // Import the template loader and clear its cache
    const { clearTemplateCache, getTemplateCacheStats } = await import('../../emails/templateLoader.js');
    const statsBefore = getTemplateCacheStats();
    clearTemplateCache(); // Clear all templates

    console.log('[Admin] Template cache cleared', {
      clearedKeys: statsBefore.keys,
      hits: statsBefore.hits,
      misses: statsBefore.misses,
    });

    res.json({
      success: true,
      message: 'Template cache cleared successfully',
      stats: {
        templatesCleared: statsBefore.keys,
        cacheHits: statsBefore.hits,
        cacheMisses: statsBefore.misses,
      },
    });
  } catch (err) {
    console.error('Failed to clear cache:', err);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
