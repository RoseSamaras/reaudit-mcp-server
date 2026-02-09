/**
 * Token Store
 * 
 * Securely stores OAuth tokens on the user's local machine.
 * Tokens are stored in ~/.reaudit/credentials.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

interface TokenFile {
  version: number;
  tokens: StoredTokens | null;
  baseUrl: string;
}

const CREDENTIALS_DIR = path.join(os.homedir(), '.reaudit');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials.json');
const FILE_VERSION = 1;

/**
 * Ensure the credentials directory exists
 */
function ensureCredentialsDir(): void {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { mode: 0o700 });
  }
}

/**
 * Get a simple encryption key based on machine ID
 * This provides basic obfuscation, not strong encryption
 */
function getEncryptionKey(): Buffer {
  const machineId = os.hostname() + os.userInfo().username;
  return crypto.createHash('sha256').update(machineId).digest();
}

/**
 * Simple encrypt for local storage
 */
function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Simple decrypt for local storage
 */
function decrypt(text: string): string {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Token Store class
 */
export class TokenStore {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Save tokens to disk
   */
  saveTokens(tokens: StoredTokens): void {
    ensureCredentialsDir();
    
    const data: TokenFile = {
      version: FILE_VERSION,
      tokens: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
      },
      baseUrl: this.baseUrl,
    };
    
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), {
      mode: 0o600,
    });
  }
  
  /**
   * Load tokens from disk
   */
  loadTokens(): StoredTokens | null {
    try {
      if (!fs.existsSync(CREDENTIALS_FILE)) {
        return null;
      }
      
      const content = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      const data: TokenFile = JSON.parse(content);
      
      // Check version and base URL
      if (data.version !== FILE_VERSION || data.baseUrl !== this.baseUrl) {
        return null;
      }
      
      if (!data.tokens) {
        return null;
      }
      
      return {
        accessToken: decrypt(data.tokens.accessToken),
        refreshToken: decrypt(data.tokens.refreshToken),
        expiresAt: data.tokens.expiresAt,
        scope: data.tokens.scope,
      };
    } catch (error) {
      console.error('Error loading tokens:', error);
      return null;
    }
  }
  
  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        fs.unlinkSync(CREDENTIALS_FILE);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }
  
  /**
   * Check if access token is expired (with 5 minute buffer)
   */
  isAccessTokenExpired(): boolean {
    const tokens = this.loadTokens();
    if (!tokens) return true;
    
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return Date.now() >= (tokens.expiresAt * 1000) - bufferMs;
  }
  
  /**
   * Get the credentials file path (for display to user)
   */
  static getCredentialsPath(): string {
    return CREDENTIALS_FILE;
  }
}
