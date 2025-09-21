
#!/usr/bin/env node

const crypto = require('crypto');

function generateSecureKeys() {
  console.log('🔐 Generating secure encryption keys for banking operations...\n');

  // Generate keys using cryptographically secure random number generator
  const keys = {
    CARD_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    AUDIT_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    AUDIT_SALT: crypto.randomBytes(16).toString('hex'),
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex')
  };

  console.log('Generated Encryption Keys (Add to Replit Secrets):');
  console.log('='.repeat(60));
  
  Object.entries(keys).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });

  console.log('\n🚨 SECURITY NOTICE:');
  console.log('- Store these keys securely in Replit Secrets');
  console.log('- Never commit these keys to your repository');
  console.log('- Rotate keys every 90 days for production');
  console.log('- Use AWS KMS for production key management');

  // Generate example AWS KMS configuration
  console.log('\n🔧 AWS KMS Environment Variables:');
  console.log('='.repeat(60));
  console.log('KMS_KEY_ID=alias/oakline-bank-master-key');
  console.log('AWS_REGION=us-east-1');
  console.log('AWS_ACCESS_KEY_ID=your-aws-access-key');
  console.log('AWS_SECRET_ACCESS_KEY=your-aws-secret-key');

  // Generate SIEM configuration
  console.log('\n📊 SIEM Configuration:');
  console.log('='.repeat(60));
  console.log('SIEM_ENDPOINT=https://your-siem-provider.com/api/events');
  console.log('SIEM_API_KEY=your-siem-api-key');
  console.log('SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook');

  return keys;
}

if (require.main === module) {
  generateSecureKeys();
}

module.exports = { generateSecureKeys };
