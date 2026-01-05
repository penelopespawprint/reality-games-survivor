/**
 * Email Template Loader
 *
 * Loads email templates from the CMS database and renders them with variables.
 * Falls back to hardcoded templates if database template doesn't exist.
 * Implements caching for performance.
 */
interface RenderedTemplate {
    subject: string;
    html: string;
    text: string | null;
    source: 'database' | 'fallback';
}
/**
 * Render an email template with variables
 *
 * @param slug - Template slug (e.g., 'welcome', 'pick-reminder')
 * @param variables - Object with variable names and values
 * @param fallbackTemplate - Optional fallback if database template doesn't exist
 * @returns Rendered template with subject, html, and text
 */
export declare function renderEmailTemplate(slug: string, variables: Record<string, string | number | boolean>, fallbackTemplate?: {
    subject: string;
    html: string;
    text?: string;
}): Promise<RenderedTemplate>;
/**
 * Clear template cache (call this when admin updates templates)
 */
export declare function clearTemplateCache(slug?: string): void;
/**
 * Get cache statistics
 */
export declare function getTemplateCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
};
export {};
//# sourceMappingURL=templateLoader.d.ts.map