import { supabase } from '../config/supabase.js';
export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }
    const token = authHeader.substring(7);
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        // Get user role from public.users table
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
        req.user = {
            id: user.id,
            email: user.email,
            role: userData?.role || 'player',
        };
        req.accessToken = token;
        next();
    }
    catch (err) {
        console.error('Auth error:', err);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Admin can do anything
        if (req.user.role === 'admin') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
// Alias for requireRole('admin') - kept for backward compatibility
export const requireAdmin = requireRole('admin');
//# sourceMappingURL=authenticate.js.map