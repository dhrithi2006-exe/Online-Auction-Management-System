import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign in failed.');
      }

      login(data.user, data.token);

      // Redirect based on role
      if (data.user.role === 'Admin') {
        navigate('/admin');
      } else if (data.user.role === 'Seller') {
        navigate('/seller');
      } else {
        navigate('/buyer');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          address: regAddress,
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      login(data.user, data.token);
      navigate('/buyer');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '40px auto' }}>
      <div className="card">
        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: !isRegister ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: !isRegister ? 600 : 400,
              color: !isRegister ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: isRegister ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: isRegister ? 600 : 400,
              color: isRegister ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Register Account
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!isRegister ? (
          /* Sign In Form */
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="form-input"
                placeholder="name@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', marginTop: '8px' }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="form-input"
                placeholder="Alex Morgan"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="form-input"
                placeholder="alex@college.edu"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="form-input"
                placeholder="+1 555-0199"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Address (Optional)</label>
              <input
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                className="form-input"
                placeholder="Campus Dorm 4B, Room 201"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password (Min. 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <div className="form-help" style={{ marginBottom: '16px' }}>
              All new registrations default to the <strong>Buyer</strong> role. Role escalation requires administrative authorization.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {loading ? 'Creating Account...' : 'Register as Buyer'}
            </button>
          </form>
        )}
      </div>

      {/* Demonstration Account Guidance Box */}
      <div
        className="card"
        style={{
          marginTop: '20px',
          backgroundColor: 'var(--bg-subtle)',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
          College Project Demo Sign-In Guide
        </div>
        <div>
          To test different user roles with full database integration:
          <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
            <li>
              <strong>New Buyer:</strong> Click <em>Register Account</em> above with any email to automatically create an authentic Buyer in CockroachDB.
            </li>
            <li>
              <strong>Existing Sample Accounts:</strong> The database holds 20 seeded accounts (Buyers, Sellers, Admins) with bcrypt passwords. You can sign in using your pre-configured demo credentials.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
