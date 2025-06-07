import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios.interceptor';

type User = {
  id: string;
  username: string;
}

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password: string) => Promise<boolean>;
}

type JwtPayload = {
  sub: string;  // This will be our user ID
  username: string;
  iat: number;
  exp: number;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      return null;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const user = {
        id: decoded.sub,
        username: decoded.username
      };
      return user;
    } catch (error) {
      localStorage.removeItem('jwt_token');
      return null;
    }
  });

  const isAuthenticated = !!user;

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post<{ access_token: string }>('/auth/login', {
        username,
        password,
      });

      const { access_token } = response.data;
      
      // Decode the JWT to get user information
      const decoded = jwtDecode<JwtPayload>(access_token);
      const userData = {
        id: decoded.sub,
        username: decoded.username
      };

      localStorage.setItem('jwt_token', access_token);
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token');
    setUser(null);
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      await api.post('/users/register', {
        username,
        password,
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // Update authentication status if token changes in another tab/window
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jwt_token') {
        try {
          if (!e.newValue) {
            setUser(null);
            return;
          }
          const decoded = jwtDecode<JwtPayload>(e.newValue);
          const userData = {
            id: decoded.sub,
            username: decoded.username
          };
          console.log('Storage event: updating user state:', userData);
          setUser(userData);
        } catch (error) {
          console.error('Failed to parse updated token:', error);
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    isAuthenticated,
    user,
    login,
    logout,
    register,
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 