
import { supabaseAdmin } from '../supabaseClient.js';

export class BankingAuditTrail {
  static async logLedgerAction(actionData) {
    const {
      transactionId,
      userId,
      action,
      beforeState,
      afterState,
      amount,
      accountId,
      metadata
    } = actionData;

    // Create immutable audit record
    await supabaseAdmin
      .from('banking_audit_trail')
      .insert({
        transaction_id: transactionId,
        user_id: userId,
        action_type: action,
        before_state: beforeState,
        after_state: afterState,
        amount: amount,
        account_id: accountId,
        metadata: metadata,
        timestamp: new Date().toISOString(),
        hash: this.generateAuditHash(actionData),
        ip_address: metadata?.ip || 'system',
        user_agent: metadata?.userAgent || 'system'
      });

    // Send to SIEM system
    await this.sendToSIEM(actionData);
  }

  static generateAuditHash(data) {
    const crypto = require('crypto');
    const content = JSON.stringify(data) + process.env.AUDIT_SALT;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static async sendToSIEM(auditData) {
    // Integration with SIEM system for banking compliance
    try {
      if (process.env.SIEM_ENDPOINT) {
        await fetch(process.env.SIEM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SIEM_API_KEY}`
          },
          body: JSON.stringify({
            source: 'oakline-bank',
            event_type: 'banking_transaction',
            severity: 'info',
            data: auditData,
            timestamp: new Date().toISOString()
          })
        });
      }
    } catch (error) {
      console.error('SIEM logging failed:', error);
      // Fallback to local secure logging
      await this.secureLocalLog(auditData);
    }
  }

  static async secureLocalLog(data) {
    // Encrypted local backup for critical audit data
    const crypto = require('crypto');
    const cipher = crypto.createCipher('aes-256-gcm', process.env.AUDIT_ENCRYPTION_KEY);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    console.log('AUDIT_BACKUP:', encrypted);
  }
}
