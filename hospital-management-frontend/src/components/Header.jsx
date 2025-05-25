import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css'; 

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1>ICareHub</h1>
        </div>
        
        
      </div>
      
      
    </header>
  );
};

export default Header;