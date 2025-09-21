
import { SECURITY_CONFIG } from '../../config/security.js';
import bcrypt from 'bcryptjs';

export class PasswordPolicy {
  static validate(password) {
    const errors = [];
    
    if (password.length < SECURITY_CONFIG.passwordMinLength) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.passwordMinLength} characters`);
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain numbers');
    }
    
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
      errors.push('Password must contain special characters');
    }
    
    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters');
    }
    
    if (/123456|password|qwerty|admin/i.test(password)) {
      errors.push('Password cannot contain common patterns');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculateStrength(password)
    };
  }
  
  static calculateStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Complexity bonus
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 15;
    
    if (score < 30) return 'weak';
    if (score < 60) return 'medium';
    if (score < 80) return 'strong';
    return 'very-strong';
  }
  
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}
