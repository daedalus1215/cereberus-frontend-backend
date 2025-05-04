import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Register } from './components/Register';
import { useAuth } from '../../auth/useAuth';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const handleRegister = async (username: string, password: string) => {
    console.log('Attempting registration...');
    try {
      const success = await register(username, password);
      console.log('Registration success:', success);
      if (success) {
        console.log('Navigating to login...');
        navigate('/login', { replace: true });
      }
      return success;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      console.log('Already authenticated, redirecting...');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className={styles.registerPage}>
      <Register onRegister={handleRegister} />
    </div>
  );
} 