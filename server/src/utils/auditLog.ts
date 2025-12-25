import { supabaseAdmin } from '../config/supabase.js';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.password_change'
  | 'user.phone_verified'
  | 'league.created'
  | 'league.joined'
  | 'league.left'
  | 'league.settings_updated'
  | 'draft.pick_made'
  | 'draft.completed'
  | 'pick.submitted'
  | 'pick.auto_filled'
  | 'waiver.processed'
  | 'scoring.finalized'
  | 'admin.user_role_changed'
  | 'admin.season_created'
  | 'admin.castaway_eliminated'
  | 'payment.completed'
  | 'payment.refunded';

interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event for security and compliance monitoring
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUDIT]', JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString(),
      }));
    }

    // In production, you could:
    // 1. Store in a dedicated audit_logs table
    // 2. Send to external logging service (e.g., Datadog, LogDNA)
    // 3. Write to a file for later analysis

    // Example: Store in database (uncomment when audit_logs table exists)
    /*
    await supabaseAdmin.from('audit_logs').insert({
      action: entry.action,
      user_id: entry.userId,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      metadata: entry.metadata,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      created_at: new Date().toISOString(),
    });
    */
  } catch (error) {
    // Never throw from audit logging - just log the error
    console.error('[AUDIT ERROR]', error);
  }
}

/**
 * Create an audit logger middleware for Express
 */
export function createAuditMiddleware(action: AuditAction) {
  return (req: any, res: any, next: any) => {
    // Log after response is sent
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user?.id) {
        logAudit({
          action,
          userId: req.user.id,
          resourceType: req.params.id ? 'id' : undefined,
          resourceId: req.params.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
    });
    next();
  };
}
