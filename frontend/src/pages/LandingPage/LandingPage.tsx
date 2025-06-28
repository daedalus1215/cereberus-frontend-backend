import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";
import { Logo } from "../../components/Logo/Logo";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoSection}>
          <Logo height={350} />
        </div>

        <div className={styles.actionSection}>
          <div className={styles.buttonGroup}>
            <div className={styles.signInSection}>
              <p>Already have an account?</p>
              <Link to="/login" className={styles.signInButton}>
                Sign in
              </Link>
            </div>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <button
              onClick={() => navigate("/register")}
              className={styles.createAccountButton}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
