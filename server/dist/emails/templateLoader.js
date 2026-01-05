/**
 * Email Template Loader
 *
 * Loads email templates from the CMS database and renders them with variables.
 * Falls back to hardcoded templates if database template doesn't exist.
 * Implements caching for performance.
 */
import { supabaseAdmin } from '../config/supabase.js';
import NodeCache from 'node-cache';
// Cache templates for 5 minutes (300 seconds)
const templateCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
/**
 * Load a template from database by slug
 */
async function loadTemplateFromDB(slug) {
    // Check cache first
    const cached = templateCache.get(slug);
    if (cached) {
        return cached;
    }
    try {
        const { data, error } = await supabaseAdmin
            .from('email_templates')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                // Not found - return null to trigger fallback
                return null;
            }
            throw error;
        }
        if (data) {
            // Cache the template
            templateCache.set(slug, data);
            return data;
        }
        return null;
    }
    catch (err) {
        console.error(`Error loading template "${slug}" from database:`, err);
        return null;
    }
}
/**
 * Replace template variables with actual values
 * Supports {{variableName}} syntax
 */
function renderTemplate(template, variables) {
    let rendered = template;
    // Replace all {{variableName}} with actual values
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, String(value));
    }
    // Remove any unreplaced variables (show as empty instead of {{var}})
    rendered = rendered.replace(/{{(\w+)}}/g, '');
    return rendered;
}
/**
 * Render an email template with variables
 *
 * @param slug - Template slug (e.g., 'welcome', 'pick-reminder')
 * @param variables - Object with variable names and values
 * @param fallbackTemplate - Optional fallback if database template doesn't exist
 * @returns Rendered template with subject, html, and text
 */
export async function renderEmailTemplate(slug, variables, fallbackTemplate) {
    // Try to load from database
    const dbTemplate = await loadTemplateFromDB(slug);
    if (dbTemplate) {
        // Render database template
        return {
            subject: renderTemplate(dbTemplate.subject, variables),
            html: renderTemplate(dbTemplate.html_body, variables),
            text: dbTemplate.text_body ? renderTemplate(dbTemplate.text_body, variables) : null,
            source: 'database',
        };
    }
    // Fall back to hardcoded template
    if (fallbackTemplate) {
        return {
            subject: fallbackTemplate.subject,
            html: fallbackTemplate.html,
            text: fallbackTemplate.text || null,
            source: 'fallback',
        };
    }
    throw new Error(`No template found for slug "${slug}" and no fallback provided`);
}
/**
 * Clear template cache (call this when admin updates templates)
 */
export function clearTemplateCache(slug) {
    if (slug) {
        templateCache.del(slug);
        console.log(`Cleared template cache for: ${slug}`);
    }
    else {
        templateCache.flushAll();
        console.log('Cleared all template cache');
    }
}
/**
 * Get cache statistics
 */
export function getTemplateCacheStats() {
    return templateCache.getStats();
}
//# sourceMappingURL=templateLoader.js.map