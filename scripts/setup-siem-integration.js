
#!/usr/bin/env node

const crypto = require('crypto');

class SIEMSetup {
  static async configureSplunk() {
    console.log('🔍 Setting up Splunk SIEM integration...\n');
    
    const config = {
      endpoint: 'https://your-splunk-instance.splunkcloud.com:8088/services/collector',
      token: `splunk-${crypto.randomBytes(16).toString('hex')}`,
      index: 'oakline_bank_security',
      sourcetype: 'banking_logs'
    };

    console.log('Splunk Configuration:');
    console.log(`SIEM_ENDPOINT=${config.endpoint}`);
    console.log(`SIEM_API_KEY=${config.token}`);
    
    return config;
  }

  static async configureDatadog() {
    console.log('🐕 Setting up Datadog SIEM integration...\n');
    
    const config = {
      endpoint: 'https://http-intake.logs.datadoghq.com/v1/input',
      apiKey: `dd-${crypto.randomBytes(16).toString('hex')}`,
      service: 'oakline-bank',
      tags: 'env:production,compliance:pci-dss'
    };

    console.log('Datadog Configuration:');
    console.log(`SIEM_ENDPOINT=${config.endpoint}/${config.apiKey}`);
    console.log(`DATADOG_API_KEY=${config.apiKey}`);
    
    return config;
  }

  static async configureElasticsearch() {
    console.log('🔍 Setting up Elasticsearch SIEM integration...\n');
    
    const config = {
      endpoint: 'https://your-elastic-cluster.es.amazonaws.com',
      username: 'oakline_siem_user',
      password: crypto.randomBytes(16).toString('hex'),
      index: 'oakline-bank-logs'
    };

    console.log('Elasticsearch Configuration:');
    console.log(`SIEM_ENDPOINT=${config.endpoint}`);
    console.log(`ELASTICSEARCH_USERNAME=${config.username}`);
    console.log(`ELASTICSEARCH_PASSWORD=${config.password}`);
    
    return config;
  }

  static async setupAlerts() {
    return {
      critical: [
        'failed_login_attempts > 5',
        'unauthorized_api_access',
        'database_connection_failures',
        'card_transaction_anomalies'
      ],
      high: [
        'password_reset_requests > 10',
        'admin_access_after_hours',
        'bulk_data_exports'
      ],
      medium: [
        'session_timeouts',
        'account_lockouts',
        'api_rate_limits_exceeded'
      ]
    };
  }
}

async function setupSIEM() {
  console.log('🚨 Banking SIEM Setup - Choose your provider:\n');
  console.log('1. Splunk (Enterprise)');
  console.log('2. Datadog (Cloud-native)');
  console.log('3. Elasticsearch (Open source)\n');

  // For demo, show all configurations
  await SIEMSetup.configureSplunk();
  console.log('\n' + '='.repeat(50) + '\n');
  await SIEMSetup.configureDatadog();
  console.log('\n' + '='.repeat(50) + '\n');
  await SIEMSetup.configureElasticsearch();

  const alerts = await SIEMSetup.setupAlerts();
  console.log('\n📊 Recommended Alert Rules:');
  console.log(JSON.stringify(alerts, null, 2));

  console.log('\n📋 Next Steps:');
  console.log('1. Choose and configure your SIEM provider');
  console.log('2. Set up log forwarding from your application');
  console.log('3. Configure alerting rules and dashboards');
  console.log('4. Test incident response procedures');
}

if (require.main === module) {
  setupSIEM();
}

module.exports = { SIEMSetup, setupSIEM };
