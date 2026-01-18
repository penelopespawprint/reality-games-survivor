/**
 * Admin Incidents Routes
 *
 * Incident management for platform issues.
 * Tracks severity, status, affected systems, and resolution.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { DateTime } from 'luxon';
import { broadcastToCommandCenter } from './command-center.js';
import { logAdminAction, AUDIT_ACTIONS } from '../../services/audit-logger.js';
const router = Router();
/**
 * GET /api/admin/incidents
 * List all incidents (with filters)
 */
router.get('/', async (req, res) => {
    try {
        const { status, severity, limit = 50, offset = 0, includeResolved = 'false' } = req.query;
        let query = supabaseAdmin
            .from('incidents')
            .select(`
        *,
        created_by_user:created_by (
          id,
          display_name,
          email
        ),
        incident_updates (
          id,
          status,
          note,
          created_at,
          created_by_user:created_by (
            id,
            display_name
          )
        )
      `, { count: 'exact' });
        // Filter by status
        if (status) {
            query = query.eq('status', status);
        }
        else if (includeResolved !== 'true') {
            query = query.neq('status', 'resolved');
        }
        // Filter by severity
        if (severity) {
            query = query.eq('severity', severity);
        }
        // Order by severity then created_at
        query = query
            .order('severity', { ascending: true })
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);
        const { data, count, error } = await query;
        if (error)
            throw error;
        res.json({
            incidents: data || [],
            total: count || 0,
            limit: Number(limit),
            offset: Number(offset),
        });
    }
    catch (err) {
        console.error('GET /api/admin/incidents error:', err);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});
/**
 * GET /api/admin/incidents/:id
 * Get a single incident with full history
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('incidents')
            .select(`
        *,
        created_by_user:created_by (
          id,
          display_name,
          email
        ),
        incident_updates (
          id,
          status,
          note,
          created_at,
          created_by_user:created_by (
            id,
            display_name
          )
        )
      `)
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Incident not found' });
            }
            throw error;
        }
        res.json(data);
    }
    catch (err) {
        console.error('GET /api/admin/incidents/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch incident' });
    }
});
/**
 * POST /api/admin/incidents
 * Declare a new incident
 */
router.post('/', async (req, res) => {
    try {
        const { severity, title, description, affectedSystems, usersAffected, workaround, link } = req.body;
        const adminId = req.user.id;
        const now = DateTime.now().setZone('America/Los_Angeles');
        // Validate required fields
        if (!severity || !title) {
            return res.status(400).json({ error: 'Severity and title are required' });
        }
        // Validate severity
        if (!['P1', 'P2', 'P3', 'P4'].includes(severity)) {
            return res.status(400).json({ error: 'Invalid severity. Must be P1, P2, P3, or P4' });
        }
        // Create incident
        const { data: incident, error } = await supabaseAdmin
            .from('incidents')
            .insert({
            severity,
            status: 'investigating',
            title,
            description,
            affected_systems: affectedSystems || [],
            users_affected: usersAffected,
            workaround,
            link,
            created_by: adminId,
        })
            .select()
            .single();
        if (error)
            throw error;
        // Add initial update note
        await supabaseAdmin.from('incident_updates').insert({
            incident_id: incident.id,
            status: 'investigating',
            note: 'Incident declared',
            created_by: adminId,
        });
        // Log audit
        await logAdminAction(req, AUDIT_ACTIONS.INCIDENT_CREATED, 'incident', incident.id, {
            severity,
            title,
            affected_systems: affectedSystems,
        });
        // Broadcast to command center
        broadcastToCommandCenter({
            type: 'incident_declared',
            data: {
                incident,
                adminId,
                timestamp: now.toISO(),
            },
        });
        res.status(201).json(incident);
    }
    catch (err) {
        console.error('POST /api/admin/incidents error:', err);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});
/**
 * PATCH /api/admin/incidents/:id
 * Update an incident
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, title, description, affectedSystems, usersAffected, workaround } = req.body;
        const adminId = req.user.id;
        const now = DateTime.now().setZone('America/Los_Angeles');
        // Get current state for audit
        const { data: current, error: fetchError } = await supabaseAdmin
            .from('incidents')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError || !current) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        // Build update object
        const updates = {};
        if (status !== undefined)
            updates.status = status;
        if (title !== undefined)
            updates.title = title;
        if (description !== undefined)
            updates.description = description;
        if (affectedSystems !== undefined)
            updates.affected_systems = affectedSystems;
        if (usersAffected !== undefined)
            updates.users_affected = usersAffected;
        if (workaround !== undefined)
            updates.workaround = workaround;
        // Set resolved_at if status changing to resolved
        if (status === 'resolved' && current.status !== 'resolved') {
            updates.resolved_at = now.toISO();
        }
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('incidents')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (updateError)
            throw updateError;
        // Log audit
        await logAdminAction(req, AUDIT_ACTIONS.INCIDENT_UPDATED, 'incident', id, {
            changes: updates,
        }, current, updated);
        // Broadcast if status changed
        if (status && status !== current.status) {
            broadcastToCommandCenter({
                type: 'incident_status_changed',
                data: {
                    incidentId: id,
                    previousStatus: current.status,
                    newStatus: status,
                    adminId,
                    timestamp: now.toISO(),
                },
            });
        }
        res.json(updated);
    }
    catch (err) {
        console.error('PATCH /api/admin/incidents/:id error:', err);
        res.status(500).json({ error: 'Failed to update incident' });
    }
});
/**
 * POST /api/admin/incidents/:id/notes
 * Add a note/update to an incident
 */
router.post('/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { note, status } = req.body;
        const adminId = req.user.id;
        const now = DateTime.now().setZone('America/Los_Angeles');
        if (!note) {
            return res.status(400).json({ error: 'Note is required' });
        }
        // Verify incident exists
        const { data: incident, error: fetchError } = await supabaseAdmin
            .from('incidents')
            .select('id, status')
            .eq('id', id)
            .single();
        if (fetchError || !incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        // If status provided, update the incident
        if (status && status !== incident.status) {
            const updates = { status };
            if (status === 'resolved') {
                updates.resolved_at = now.toISO();
            }
            await supabaseAdmin
                .from('incidents')
                .update(updates)
                .eq('id', id);
            broadcastToCommandCenter({
                type: 'incident_status_changed',
                data: {
                    incidentId: id,
                    previousStatus: incident.status,
                    newStatus: status,
                    adminId,
                    timestamp: now.toISO(),
                },
            });
        }
        // Add the note
        const { data: update, error: insertError } = await supabaseAdmin
            .from('incident_updates')
            .insert({
            incident_id: id,
            status: status || incident.status,
            note,
            created_by: adminId,
        })
            .select(`
        *,
        created_by_user:created_by (
          id,
          display_name
        )
      `)
            .single();
        if (insertError)
            throw insertError;
        res.status(201).json(update);
    }
    catch (err) {
        console.error('POST /api/admin/incidents/:id/notes error:', err);
        res.status(500).json({ error: 'Failed to add note' });
    }
});
/**
 * POST /api/admin/incidents/:id/resolve
 * Resolve an incident
 */
router.post('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const adminId = req.user.id;
        const now = DateTime.now().setZone('America/Los_Angeles');
        // Get current incident
        const { data: incident, error: fetchError } = await supabaseAdmin
            .from('incidents')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError || !incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        if (incident.status === 'resolved') {
            return res.status(400).json({ error: 'Incident is already resolved' });
        }
        // Update incident
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('incidents')
            .update({
            status: 'resolved',
            resolved_at: now.toISO(),
        })
            .eq('id', id)
            .select()
            .single();
        if (updateError)
            throw updateError;
        // Add resolution note
        await supabaseAdmin.from('incident_updates').insert({
            incident_id: id,
            status: 'resolved',
            note: note || 'Incident resolved',
            created_by: adminId,
        });
        // Log audit
        await logAdminAction(req, AUDIT_ACTIONS.INCIDENT_RESOLVED, 'incident', id, {
            duration_minutes: now.diff(DateTime.fromISO(incident.created_at), 'minutes').minutes,
        });
        // Broadcast
        broadcastToCommandCenter({
            type: 'incident_resolved',
            data: {
                incidentId: id,
                adminId,
                timestamp: now.toISO(),
            },
        });
        res.json(updated);
    }
    catch (err) {
        console.error('POST /api/admin/incidents/:id/resolve error:', err);
        res.status(500).json({ error: 'Failed to resolve incident' });
    }
});
/**
 * GET /api/admin/incidents/active/count
 * Get count of active incidents (for badges)
 */
router.get('/active/count', async (req, res) => {
    try {
        const { count, error } = await supabaseAdmin
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'resolved');
        if (error)
            throw error;
        res.json({ count: count || 0 });
    }
    catch (err) {
        console.error('GET /api/admin/incidents/active/count error:', err);
        res.status(500).json({ error: 'Failed to fetch count' });
    }
});
export default router;
//# sourceMappingURL=incidents.js.map