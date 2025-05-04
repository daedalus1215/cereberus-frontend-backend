import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Sidebar } from './Sidebar/Sidebar';
import styles from './Header.module.css';
import { Logo } from '../Logo/Logo';

export const Header: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  console.log(user);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <button onClick={toggleSidebar} className={styles.brand}>
            <Logo />
            <span className={styles.name}>Cerberus</span>
          </button>
          <div className={styles.rightSection}>
            <span className={styles.username}>{user?.username}</span>
            <button 
              onClick={handleSignOut} 
              className={styles.signOutButton}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </>
  );
} 