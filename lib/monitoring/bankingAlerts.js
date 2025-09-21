
import { SIEM_CONFIG } from '../../config/siem.js';

export class BankingAlerts {
  static async sendCriticalAlert(alertData) {
    const alert = {
      level: 'CRITICAL',
      timestamp: new Date().toISOString(),
      source: 'oakline-bank-security',
      ...alertData
    };
    
    // Send to multiple channels
    await Promise.all([
      this.sendToSIEM(alert),
      this.sendToSlack(alert),
      this.sendEmail(alert),
      this.logToConsole(alert)
    ]);
  }
  
  static async sendToSIEM(alert) {
    if (!SIEM_CONFIG.enabled) return;
    
    try {
      await fetch(SIEM_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SIEM_CONFIG.apiKey}`
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('SIEM alert failed:', error);
    }
  }
  
  static async sendToSlack(alert) {
    if (!process.env.SLACK_WEBHOOK_URL) return;
    
    const message = {
      text: `🚨 Banking Security Alert: ${alert.title}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Level', value: alert.level, short: true },
          { title: 'Time', value: alert.timestamp, short: true },
          { title: 'Details', value: alert.description, short: false }
        ]
      }]
    };
    
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Slack alert failed:', error);
    }
  }
  
  static async sendEmail(alert) {
    // Email notification for critical alerts
    console.log('Email alert would be sent:', alert);
  }
  
  static logToConsole(alert) {
    console.error('🚨 BANKING SECURITY ALERT:', JSON.stringify(alert, null, 2));
  }
}
