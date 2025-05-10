import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionAdapter {
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(encryptionKey: string, encryptionSalt: string) {
    this.key = crypto.scryptSync(encryptionKey, encryptionSalt, 32); 
    this.iv = Buffer.alloc(16, 0); 
  }

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