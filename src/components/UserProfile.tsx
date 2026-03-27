import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserProfileProps {
  showUsername?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ showUsername = false }) => {
  const { currentUser, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  // Show login button when no user is logged in
  if (!currentUser) {
    return (
      <div className="user-profile">
        <button className="login-button" onClick={handleLogin}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          Sign In
        </button>
      </div>
    );
  }

  const displayName = currentUser.displayName || 'Anonymous';

  return (
    <div className="user-profile">
      <button 
        className={`user-avatar-container ${showUsername ? 'with-username' : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="user-avatar">
          {currentUser.photoURL ? (
            <img src={currentUser.photoURL} alt="Profile" />
          ) : (
            <div className="avatar-placeholder">
              {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
            </div>
          )}
        </div>
        {showUsername && (
          <span className="username-display">{displayName}</span>
        )}
      </button>

      {showDropdown && (
        <div className="user-dropdown">
          <div className="user-info">
            <div className="user-name">
              {displayName}
            </div>
            <div className="user-email">
              {currentUser.email}
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <button className="dropdown-item logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};