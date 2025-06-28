import React from "react";
import { useNavigate } from "react-router-dom";
import { Register } from "./components/Register";
import { useAuth } from "../../auth/useAuth";
import styles from "./RegisterPage.module.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const handleRegister = async (username: string, password: string) => {
    try {
      const success = await register(username, password);
      if (success) {
        navigate("/login", { replace: true });
      }
      return success;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className={styles.registerPage}>
      <Register onRegister={handleRegister} />
    </div>
  );
}
