import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import '../App.css';

const Navigation = () => {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div className={`nav-container ${isAuthenticated ? 'nav-logged-in' : ''}`}>
      <Link to="/help" className="help-link">Help</Link>
    </div>
  );
};

export default Navigation; 