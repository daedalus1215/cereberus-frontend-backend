import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PasswordEncryptionService {
  // In production, use env/config for key/iv
  private readonly key = crypto.scryptSync('demo_secret_key', 'salt', 32); // 32 bytes for AES-256
  private readonly iv = Buffer.alloc(16, 0); // 16 bytes IV (all zeros for demo)

  encrypt(plain: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
    let encrypted = cipher.update(plain, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  decrypt(encrypted: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
} 