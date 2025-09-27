// lib/middleware/verifyAdminRole.js
import { supabaseAdmin } from '../supabaseAdmin.js';

export const verifyAdminRole = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No authenticated user' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('admin_profiles')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.is_active || !['admin', 'superadmin', 'auditor'].includes(profile.role)) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.adminProfile = profile; // attach admin info for later use
    next();
  } catch (err) {
    console.error('Admin role check error:', err);
    return res.status(500).json({ error: 'Admin verification failed' });
  }
};
