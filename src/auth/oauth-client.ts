/**
 * OAuth Client
 * 
 * Handles the OAuth 2.0 authorization code flow with PKCE
 * for authenticating with the Reaudit API.
 */

import * as http from 'http';
import * as crypto from 'crypto';
import * as url from 'url';
import * as child_process from 'child_process';
import axios from 'axios';
import { TokenStore } from './token-store.js';

/**
 * Open URL in default browser (cross-platform)
 */
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  let command: string;
  let args: string[];
  
  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    // Linux and others
    command = 'xdg-open';
    args = [url];
  }
  
  return new Promise((resolve, reject) => {
    const proc = child_process.spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();
    proc.on('error', reject);
    // Resolve immediately since we detached
    setTimeout(resolve, 100);
  });
}

const CALLBACK_PORT = 3847;
const CLIENT_ID = process.env.REAUDIT_CLIENT_ID || 'reaudit-mcp-server';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier
 */
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * OAuth Client class
 */
export class OAuthClient {
  private baseUrl: string;
  private tokenStore: TokenStore;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.tokenStore = new TokenStore(baseUrl);
  }
  
  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // Check for existing tokens
    const tokens = this.tokenStore.loadTokens();
    
    if (tokens) {
      // Check if access token is still valid
      if (!this.tokenStore.isAccessTokenExpired()) {
        return tokens.accessToken;
      }
      
      // Try to refresh
      try {
        const newTokens = await this.refreshToken(tokens.refreshToken);
        return newTokens.access_token;
      } catch (error) {
        console.error('Token refresh failed, need to re-authenticate');
        this.tokenStore.clearTokens();
      }
    }
    
    // No valid tokens, need to authenticate
    return this.authenticate();
  }
  
  /**
   * Start the OAuth flow
   */
  async authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(16).toString('hex');
      
      // Create local server to receive callback
      const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url || '', true);
        
        if (parsedUrl.pathname === '/callback') {
          const code = parsedUrl.query.code as string;
          const returnedState = parsedUrl.query.state as string;
          const error = parsedUrl.query.error as string;
          
          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(this.getErrorPage('Authorization Denied', error === 'access_denied' ? 'You denied the authorization request.' : `Error: ${error}`));
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }
          
          if (returnedState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(this.getErrorPage('Security Error', 'State mismatch detected. This could be a security issue. Please try again.'));
            server.close();
            reject(new Error('State mismatch'));
            return;
          }
          
          try {
            // Exchange code for tokens
            const tokens = await this.exchangeCode(code, codeVerifier);
            
            // Save tokens
            this.tokenStore.saveTokens({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
              scope: tokens.scope,
            });
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Authorization Successful - Reaudit</title>
                  <link rel="icon" href="https://reaudit.io/favicon.ico">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); min-height: 100vh; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div style="background: white; padding: 48px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 420px;">
                    <img src="https://reaudit.io/reaudit-logo-light.svg" alt="Reaudit" style="height: 40px; margin-bottom: 24px;">
                    <div style="width: 64px; height: 64px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h1 style="color: #10b981; margin: 0 0 12px; font-size: 24px; font-weight: 600;">Authorization Successful</h1>
                    <p style="color: #64748b; margin: 0 0 24px; font-size: 15px;">You can close this window and return to your AI assistant.</p>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">This window will close automatically in 3 seconds...</p>
                  </div>
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                    <a href="https://reaudit.io/help/mcp" style="color: #231f20; text-decoration: none;">Need help?</a>
                    &nbsp;&bull;&nbsp;
                    <a href="https://reaudit.io" style="color: #231f20; text-decoration: none;">reaudit.io</a>
                  </p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);
            
            server.close();
            resolve(tokens.access_token);
          } catch (err) {
            console.error('Token exchange error:', err);
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(this.getErrorPage('Token Exchange Failed', 'Failed to complete authorization. Please try again or contact support.'));
            server.close();
            reject(err);
          }
        }
      });
      
      server.listen(CALLBACK_PORT, () => {
        // Build authorization URL
        const authUrl = new URL(`${this.baseUrl}/api/oauth/authorize`);
        authUrl.searchParams.set('client_id', CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', `http://localhost:${CALLBACK_PORT}/callback`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'full_access');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        
        console.error('\n🔐 Opening browser for authentication...');
        console.error('If the browser doesn\'t open, visit this URL:');
        console.error(authUrl.toString());
        console.error('');
        
        // Open browser
        openBrowser(authUrl.toString()).catch(() => {
          console.error('Could not open browser automatically.');
        });
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  }
  
  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    const response = await axios.post(`${this.baseUrl}/api/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: `http://localhost:${CALLBACK_PORT}/callback`,
      code_verifier: codeVerifier,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.data;
  }
  
  /**
   * Refresh access token
   */
  private async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await axios.post(`${this.baseUrl}/api/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Save new tokens
    this.tokenStore.saveTokens({
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + response.data.expires_in,
      scope: response.data.scope,
    });
    
    return response.data;
  }
  
  /**
   * Revoke tokens and clear local storage
   */
  async logout(): Promise<void> {
    const tokens = this.tokenStore.loadTokens();
    
    if (tokens) {
      try {
        await axios.post(`${this.baseUrl}/api/oauth/revoke`, {
          token: tokens.refreshToken,
          token_type_hint: 'refresh_token',
        });
      } catch (error) {
        // Ignore errors during revocation
      }
    }
    
    this.tokenStore.clearTokens();
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.tokenStore.loadTokens();
    return tokens !== null;
  }
  
  /**
   * Generate branded error page HTML
   */
  private getErrorPage(title: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title} - Reaudit</title>
          <link rel="icon" href="https://reaudit.io/favicon.ico">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); min-height: 100vh; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="background: white; padding: 48px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 420px;">
            <img src="https://reaudit.io/reaudit-logo-light.svg" alt="Reaudit" style="height: 40px; margin-bottom: 24px;">
            <div style="width: 64px; height: 64px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h1 style="color: #ef4444; margin: 0 0 12px; font-size: 24px; font-weight: 600;">${title}</h1>
            <p style="color: #64748b; margin: 0 0 24px; font-size: 15px;">${message}</p>
            <button onclick="window.close()" style="background: #231f20; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Close Window</button>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            <a href="https://reaudit.io/help/mcp" style="color: #231f20; text-decoration: none;">Need help?</a>
            &nbsp;&bull;&nbsp;
            <a href="https://reaudit.io" style="color: #231f20; text-decoration: none;">reaudit.io</a>
          </p>
        </body>
      </html>
    `;
  }
}
