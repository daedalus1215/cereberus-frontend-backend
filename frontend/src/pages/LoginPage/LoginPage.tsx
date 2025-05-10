import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Login } from './components/Login';
import { useAuth } from '../../auth/useAuth';
import { Logo } from '../../components/Logo/Logo';
import styles from './LoginPage.module.css';

export const LoginPage:React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const handleLogin = async (username: string, password: string) => {
    try {
      const success = await login(username, password);
      if (success) {  
        // Only navigate after successful login
        navigate('/', { replace: true });
      }
      return success;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // This effect is now just a safeguard
  // React.useEffect(() => {
  //   if (isAuthenticated) {
  //     navigate('/', { replace: true });
  //   }
  // }, [isAuthenticated, navigate]);

  return (
    <div className={styles.loginPage}>
      <h1 className={styles.title}>
        <Logo height={100} />
        Sign in to Cerberus
      </h1>
      <Login onLogin={handleLogin} />
    </div>
  );
} 