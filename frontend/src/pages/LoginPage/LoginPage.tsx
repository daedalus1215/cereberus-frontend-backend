import React from "react";
import { useNavigate } from "react-router-dom";
import { Login } from "./components/Login";
import { useAuth } from "../../auth/useAuth";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const handleLogin = async (username: string, password: string) => {
    try {
      const success = await login(username, password);
      if (success) {
        // Only navigate after successful login
        navigate("/", { replace: true });
      }
      return success;
    } catch (error) {
      console.error("Login error: Authentication failed");
      return false;
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return <Login onLogin={handleLogin} />;
};
