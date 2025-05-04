import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { Logo } from '../../Logo/Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay */}
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <Link to="/" className={styles.brand}>
            <Logo />
            <span className={styles.name}>Cerberus</span>
          </Link>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          <Link to="/" className={styles.navItem}>
            <span className={styles.navText}>Home</span>
          </Link>
          <Link to="/notes" className={styles.navItem}>
            <span className={styles.navText}>Notes</span>
          </Link>
          <Link to="/memos" className={styles.navItem}>
            <span className={styles.navText}>Memos</span>
          </Link>
          <Link to="/tags" className={styles.navItem}>
            <span className={styles.navText}>Tags</span>
          </Link>
        </nav>
      </aside>
    </>
  );
} 