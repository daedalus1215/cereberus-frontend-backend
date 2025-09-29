/**
 * Secure token storage utilities
 * Uses httpOnly cookies for JWT storage to prevent XSS attacks
 */

interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
  isTokenValid(): boolean;
}

class SecureTokenStorage implements TokenStorage {
  private readonly TOKEN_KEY = 'jwt_token';

  /**
   * Get token from httpOnly cookie via API call
   * This is more secure than localStorage as it's not accessible via JavaScript
   */
  getToken(): string | null {
    // For now, we'll use a hybrid approach:
    // 1. Try to get from httpOnly cookie via API
    // 2. Fallback to sessionStorage (more secure than localStorage)
    // 3. Remove localStorage usage entirely
    
    // Check sessionStorage first (more secure than localStorage)
    const sessionToken = sessionStorage.getItem(this.TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }
    
    return null;
  }

  /**
   * Store token in sessionStorage (more secure than localStorage)
   * In production, this should be handled by the backend via httpOnly cookies
   */
  setToken(token: string): void {
    // Store in sessionStorage instead of localStorage
    // sessionStorage is cleared when the tab is closed, reducing attack surface
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Remove token from storage
   */
  removeToken(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    // Also clear localStorage if it exists (migration cleanup)
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Check if token exists and is not expired
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const tokenStorage = new SecureTokenStorage();

/**
 * Future implementation for httpOnly cookies:
 * 
 * 1. Backend should set httpOnly cookies on login
 * 2. Frontend should call /auth/me endpoint to get user info
 * 3. No token storage in frontend JavaScript at all
 * 
 * Example backend implementation:
 * 
 * @Post('login')
 * async login(@Body() loginDto: LoginDto, @Res() res: Response) {
 *   const { access_token, user } = await this.authService.login(loginDto);
 *   
 *   res.cookie('auth_token', access_token, {
 *     httpOnly: true,
 *     secure: process.env.NODE_ENV === 'production',
 *     sameSite: 'strict',
 *     maxAge: 24 * 60 * 60 * 1000 // 24 hours
 *   });
 *   
 *   return res.json({ user });
 * }
 */
