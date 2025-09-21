
import crypto from 'crypto';

export class SecretsManager {
  static async encryptSecret(secret, key) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm
    };
  }

  static async decryptSecret(encryptedData, key) {
    const decipher = crypto.createDecipher(encryptedData.algorithm, key);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static async rotateAllSecrets() {
    const secrets = [
      'SUPABASE_SERVICE_KEY',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'AUDIT_ENCRYPTION_KEY'
    ];

    for (const secretName of secrets) {
      await this.rotateSecret(secretName);
    }
  }

  static async rotateSecret(secretName) {
    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    // Store in secure vault
    await this.storeSecretSecurely(secretName, newSecret);
    
    // Update environment
    process.env[`${secretName}_NEW`] = newSecret;
    
    // Schedule activation
    setTimeout(() => {
      process.env[secretName] = process.env[`${secretName}_NEW`];
      delete process.env[`${secretName}_NEW`];
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  static async storeSecretSecurely(name, value) {
    // In production, integrate with AWS Secrets Manager or Azure Key Vault
    console.log(`Storing secret ${name} in secure vault`);
  }
}
