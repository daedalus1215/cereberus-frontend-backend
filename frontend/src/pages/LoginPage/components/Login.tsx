import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Logo } from "../../../components/Logo/Logo";
import { currentServerHost, isTauri } from "../../../tauri/api-config";
import { openConnectionSettings } from "../../../tauri/connection-settings";
import styles from "./Login.module.css";

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError("Invalid credentials");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError(
          isTauri()
            ? "Couldn't reach Cereberus. Check your connection, or the server settings below."
            : "Couldn't reach Cereberus. Check your connection and try again.",
        );
      } else {
        setError("An error occurred during login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>
          <Logo height={75} />
          <span>Login</span>
        </h2>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.formGroup}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className={styles.registerLink}>
        Don't have an account? <Link to="/register">Register here</Link>
      </div>
      {isTauri() && (
        <>
          {/* So a server changed behind your back shows before you type a password. */}
          <Typography
            variant="caption"
            component="div"
            align="center"
            sx={{ mt: 1 }}
          >
            Server: {currentServerHost()}
          </Typography>
          <Button
            size="small"
            onClick={() => openConnectionSettings()}
            sx={{ display: "block", mx: "auto", textTransform: "none" }}
          >
            Server settings
          </Button>
        </>
      )}
    </div>
  );
}
