import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Nexus2
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          <i className={isMenuOpen ? 'fas fa-times' : 'fas fa-bars'} />
        </div>

        <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
          </li>

          {isAuthenticated ? (
            <>
              <li className="nav-item">
                <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/entrepreneurs" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                  Entrepreneurs
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/investors" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                  Investors
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/messages" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                  Messages
                </Link>
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-link btn-logout">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link nav-link-btn" onClick={() => setIsMenuOpen(false)}>
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;