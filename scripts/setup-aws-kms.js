
#!/usr/bin/env node

const AWS = require('@aws-sdk/client-kms');

async function setupAWSKMS() {
  console.log('🔐 Setting up AWS KMS for Oakline Bank...\n');
  
  const kmsClient = new AWS.KMSClient({ 
    region: process.env.AWS_REGION || 'us-east-1'
  });

  try {
    // Create master key for banking operations
    const createKeyParams = {
      Description: 'Oakline Bank Master Key for PCI DSS compliance',
      Usage: 'ENCRYPT_DECRYPT',
      CustomerMasterKeySpec: 'SYMMETRIC_DEFAULT',
      Origin: 'AWS_KMS',
      MultiRegion: false,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'Enable IAM User Permissions',
            Effect: 'Allow',
            Principal: { AWS: `arn:aws:iam::YOUR_AWS_ACCOUNT_ID:root` },
            Action: 'kms:*',
            Resource: '*'
          },
          {
            Sid: 'Allow use of the key for banking operations',
            Effect: 'Allow',
            Principal: { AWS: `arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/oakline-bank-service-role` },
            Action: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey'
            ],
            Resource: '*'
          }
        ]
      }),
      Tags: [
        { TagKey: 'Application', TagValue: 'OaklineBank' },
        { TagKey: 'Compliance', TagValue: 'PCI-DSS' },
        { TagKey: 'Environment', TagValue: process.env.NODE_ENV || 'development' }
      ]
    };

    const createKeyResult = await kmsClient.send(new AWS.CreateKeyCommand(createKeyParams));
    console.log('✅ Created KMS key:', createKeyResult.KeyMetadata.KeyId);

    // Create alias for easier reference
    const aliasParams = {
      AliasName: 'alias/oakline-bank-master-key',
      TargetKeyId: createKeyResult.KeyMetadata.KeyId
    };

    await kmsClient.send(new AWS.CreateAliasCommand(aliasParams));
    console.log('✅ Created alias: alias/oakline-bank-master-key');

    // Generate initial data encryption keys
    const dataKeyParams = {
      KeyId: 'alias/oakline-bank-master-key',
      KeySpec: 'AES_256'
    };

    const dataKeyResult = await kmsClient.send(new AWS.GenerateDataKeyCommand(dataKeyParams));
    
    console.log('\n🔑 Environment Variables to Add:');
    console.log(`KMS_KEY_ID=alias/oakline-bank-master-key`);
    console.log(`CARD_ENCRYPTION_KEY=${Buffer.from(dataKeyResult.Plaintext).toString('hex')}`);
    console.log(`AUDIT_ENCRYPTION_KEY=${Buffer.from(dataKeyResult.Plaintext).toString('hex')}`);
    
    return {
      keyId: createKeyResult.KeyMetadata.KeyId,
      alias: 'alias/oakline-bank-master-key',
      encryptionKey: Buffer.from(dataKeyResult.Plaintext).toString('hex')
    };

  } catch (error) {
    console.error('❌ AWS KMS setup failed:', error);
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to AWS Console → KMS');
    console.log('2. Create a new symmetric key');
    console.log('3. Set alias as "oakline-bank-master-key"');
    console.log('4. Configure IAM permissions for your service role');
  }
}

// Run if called directly
if (require.main === module) {
  setupAWSKMS();
}

module.exports = { setupAWSKMS };
