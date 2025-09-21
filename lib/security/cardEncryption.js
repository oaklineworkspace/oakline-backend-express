
import crypto from 'crypto';
import { KeyManager } from '../keyManagement.js';

export class PCICardEncryption {
  static ALGORITHM = 'aes-256-gcm';
  
  static async encryptCardData(cardData) {
    const { number, cvv, expiry, pin } = cardData;
    
    // PCI DSS requirement: Never store CVV/CVC
    if (cvv) {
      console.warn('CVV detected - will not be stored per PCI DSS requirements');
    }
    
    const encryptionKey = process.env.CARD_ENCRYPTION_KEY || KeyManager.generateEncryptionKey();
    
    return {
      // Encrypt PAN (Primary Account Number)
      encrypted_number: await this.encryptField(number, encryptionKey),
      // Mask PAN for display (show only last 4 digits)
      masked_number: this.maskPAN(number),
      // Store encrypted expiry
      encrypted_expiry: await this.encryptField(expiry, encryptionKey),
      // Store encrypted PIN if provided
      encrypted_pin: pin ? await this.encryptField(pin, encryptionKey) : null,
      // CVV is never stored
      cvv: undefined,
      // Encryption metadata
      encryption_version: '1.0',
      encryption_algorithm: this.ALGORITHM,
      encrypted_at: new Date().toISOString()
    };
  }
  
  static async encryptField(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, key);
    
    let encrypted = cipher.update(data.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  static async decryptField(encryptedData, key) {
    const decipher = crypto.createDecipher(this.ALGORITHM, key);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  static maskPAN(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) return '****';
    
    const last4 = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4) + last4;
    
    return masked;
  }
  
  static async tokenizeCard(cardData) {
    // Generate secure token for card reference
    const token = crypto.randomBytes(16).toString('hex');
    
    return {
      token,
      encrypted_data: await this.encryptCardData(cardData),
      tokenized_at: new Date().toISOString()
    };
  }
  
  static validatePCICompliance(cardData) {
    const violations = [];
    
    // Check for CVV storage
    if (cardData.cvv || cardData.cvc || cardData.security_code) {
      violations.push('CVV/CVC storage detected - PCI DSS violation');
    }
    
    // Check for unencrypted PAN
    if (cardData.number && !cardData.encrypted_number) {
      violations.push('Unencrypted PAN detected - PCI DSS violation');
    }
    
    // Check for weak encryption
    if (cardData.encryption_algorithm && cardData.encryption_algorithm !== this.ALGORITHM) {
      violations.push('Weak encryption algorithm detected');
    }
    
    return {
      compliant: violations.length === 0,
      violations
    };
  }
}
