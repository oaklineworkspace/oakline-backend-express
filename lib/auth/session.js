
import { supabase } from '../supabaseClient.js';
import { SECURITY_CONFIG } from '../../config/security.js';

export class SessionManager {
  static async enforceSessionTimeout() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const sessionStart = new Date(session.created_at);
      const now = new Date();
      const minutesPassed = (now - sessionStart) / (1000 * 60);
      
      if (minutesPassed > SECURITY_CONFIG.sessionTimeoutMinutes) {
        await this.auditSecurityEvent('SESSION_TIMEOUT', session.user.id);
        await supabase.auth.signOut();
        window.location.href = '/login?reason=session_timeout';
      }
    }
  }

  static async auditSecurityEvent(event, userId) {
    await supabaseAdmin.from('security_audit_log').insert({
      event_type: event,
      user_id: userId,
      timestamp: new Date().toISOString(),
      ip_address: window.location.hostname,
      user_agent: navigator.userAgent
    });
  }

  static async requireMFA(userRole) {
    if (userRole === 'admin' && SECURITY_CONFIG.adminMfaRequired) {
      const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
      
      if (!mfaFactors || mfaFactors.length === 0) {
        throw new Error('MFA is required for admin users');
      }
    }
  }

  static startSessionMonitoring() {
    // Check session every 5 minutes
    setInterval(this.enforceSessionTimeout, 5 * 60 * 1000);
  }
}
