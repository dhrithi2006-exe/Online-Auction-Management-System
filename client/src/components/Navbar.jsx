import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'Seller') return '/seller';
    return '/buyer';
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-title">BidHouse</span>
          <span className="brand-tag">Auction Management</span>
        </Link>

        <nav>
          <ul className="nav-links">
            <li>
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/browse" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Browse Auctions
              </NavLink>
            </li>
            <li>
              <NavLink to="/tracking" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Track Order
              </NavLink>
            </li>
            {user && (
              <li>
                <NavLink to={getDashboardPath()} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {user.role} Dashboard
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="nav-user-area">
          {user ? (
            <>
              <div className="user-badge">
                <span>{user.name}</span>
                <span className="role-tag">{user.role}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
