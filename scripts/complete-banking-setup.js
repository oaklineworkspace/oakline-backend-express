
#!/usr/bin/env node

console.log('🏦 Oakline Bank Complete Setup Guide\n');
console.log('This will guide you through setting up all required accounts and services.\n');

const setupSteps = {
  'Step 1': {
    title: '🔐 AWS Account Setup',
    instructions: [
      '1. Go to https://aws.amazon.com and create account',
      '2. Choose "Personal" account type',
      '3. Complete billing setup (required for KMS)',
      '4. Enable MFA on root account',
      '5. Create IAM user with KMS permissions',
      '6. Note down your AWS Account ID (12-digit number)'
    ],
    environmentVars: [
      'AWS_ACCOUNT_ID=123456789012',
      'AWS_ACCESS_KEY_ID=your-iam-access-key',
      'AWS_SECRET_ACCESS_KEY=your-iam-secret-key',
      'AWS_REGION=us-east-1'
    ]
  },
  
  'Step 2': {
    title: '📊 SIEM Provider Setup (Choose One)',
    instructions: [
      'Option A - Datadog (Recommended for beginners):',
      '1. Go to https://datadoghq.com',
      '2. Sign up for free trial',
      '3. Create API key in Organization Settings',
      '',
      'Option B - Splunk:',
      '1. Go to https://splunk.com',
      '2. Sign up for Splunk Cloud trial',
      '3. Create HTTP Event Collector token',
      '',
      'Option C - Elasticsearch:',
      '1. Use AWS OpenSearch service',
      '2. Create cluster and get endpoint'
    ],
    environmentVars: [
      'SIEM_ENDPOINT=https://http-intake.logs.datadoghq.com/v1/input',
      'SIEM_API_KEY=your-datadog-api-key',
      'DATADOG_API_KEY=your-datadog-key'
    ]
  },
  
  'Step 3': {
    title: '📢 Slack Alerts Setup',
    instructions: [
      '1. Create Slack workspace at https://slack.com',
      '2. Create #banking-alerts channel',
      '3. Go to Apps → Incoming Webhooks',
      '4. Create webhook for #banking-alerts',
      '5. Copy webhook URL'
    ],
    environmentVars: [
      'SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    ]
  },
  
  'Step 4': {
    title: '🔑 Generate Encryption Keys',
    instructions: [
      '1. Run: node scripts/generate-encryption-keys.js',
      '2. Copy all generated keys',
      '3. Add them to Replit Secrets (NOT environment files)',
      '4. Never commit these keys to your repository'
    ]
  },
  
  'Step 5': {
    title: '⚙️ Configure Services',
    instructions: [
      '1. Run: node scripts/setup-aws-kms.js',
      '2. Run: node scripts/setup-siem-integration.js',
      '3. Run: node scripts/setup-backup-strategy.js',
      '4. Add all environment variables to Replit Secrets'
    ]
  }
};

// Display setup guide
Object.entries(setupSteps).forEach(([step, config]) => {
  console.log(`\n${step}: ${config.title}`);
  console.log('='.repeat(60));
  
  config.instructions.forEach(instruction => {
    console.log(instruction);
  });
  
  if (config.environmentVars) {
    console.log('\n📝 Environment Variables to Add:');
    config.environmentVars.forEach(envVar => {
      console.log(`   ${envVar}`);
    });
  }
  
  console.log('\n');
});

console.log('🚨 IMPORTANT SECURITY NOTES:');
console.log('- Store ALL sensitive keys in Replit Secrets');
console.log('- Never commit keys to your repository');
console.log('- Enable MFA on all accounts');
console.log('- Use unique, strong passwords');
console.log('- Review permissions regularly');

console.log('\n📋 Next Steps After Account Creation:');
console.log('1. Generate encryption keys: node scripts/generate-encryption-keys.js');
console.log('2. Set up AWS KMS: node scripts/setup-aws-kms.js');
console.log('3. Configure SIEM: node scripts/setup-siem-integration.js');
console.log('4. Set up backups: node scripts/setup-backup-strategy.js');
console.log('5. Add all keys to Replit Secrets');

console.log('\n✅ Once complete, your banking app will be compliance-ready!');
