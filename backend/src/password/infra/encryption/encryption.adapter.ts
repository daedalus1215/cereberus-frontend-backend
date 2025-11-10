import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class EncryptionAdapter {
  private readonly key: Buffer;

  constructor(encryptionKey: string, encryptionSalt: string) {
    this.key = crypto.scryptSync(encryptionKey, encryptionSalt, 32);
  }

  encrypt(plain: string): string {
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.key, iv);
    
    let encrypted = cipher.update(plain, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    // Prepend IV to the encrypted data (IV doesn't need to be secret)
    return iv.toString("base64") + ":" + encrypted;
  }

  decrypt(encrypted: string): string {
    // Split the IV and encrypted data
    const parts = encrypted.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }
    
    const iv = Buffer.from(parts[0], "base64");
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.key, iv);
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
