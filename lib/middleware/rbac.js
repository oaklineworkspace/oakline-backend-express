
import { supabaseAdmin } from '../supabaseClient.js';

export const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    req.userProfile = profile;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !allowedRoles.includes(profile?.role)) {
        return res.status(403).json({ 
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
        });
      }

      req.user = user;
      req.userProfile = profile;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
};
