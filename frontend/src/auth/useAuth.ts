import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import api from "../api/axios.interceptor";
import { isAccessDenied } from "../tauri/cloudflare-access";
import { tokenStorage } from "./tokenStorage";

type User = {
  id: string;
  username: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password: string) => Promise<boolean>;
};

type JwtPayload = {
  sub: string; // This will be our user ID
  username: string;
  iat: number;
  exp: number;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(() => {
    const token = tokenStorage.getToken();
    if (!token || !tokenStorage.isTokenValid()) {
      return null;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const user = {
        id: decoded.sub,
        username: decoded.username,
      };
      return user;
    } catch {
      tokenStorage.removeToken();
      return null;
    }
  });

  const isAuthenticated = !!user;

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const response = await api.post<{ access_token: string }>(
          "auth/login",
          {
            username,
            password,
          },
        );

        const { access_token } = response.data;

        // Decode the JWT to get user information
        const decoded = jwtDecode<JwtPayload>(access_token);
        const userData = {
          id: decoded.sub,
          username: decoded.username,
        };

        tokenStorage.setToken(access_token);
        setUser(userData);
        return true;
      } catch (error) {
        // Log error without exposing sensitive information
        console.error("Login failed: Authentication error");
        // Only Cereberus turning the credentials down is a failed login.
        // Anything else (no connection, the server down, Cloudflare Access
        // rejecting the app's token) is thrown for the login page to report
        // as such.
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401 &&
          !isAccessDenied(error)
        ) {
          return false;
        }
        throw error;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStorage.removeToken();
    setUser(null);
  }, []);

  const register = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        await api.post("/users/register", {
          username,
          password,
        });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  // Update authentication status if token changes in another tab/window
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "jwt_token") {
        try {
          if (!e.newValue) {
            setUser(null);
            return;
          }
          const decoded = jwtDecode<JwtPayload>(e.newValue);
          const userData = {
            id: decoded.sub,
            username: decoded.username,
          };
          setUser(userData);
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
