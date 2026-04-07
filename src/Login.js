import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      return;
    }

    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);

    if (result.success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Official Indian Railways Logo */}
        <div className="login-logo">
          <img 
            src="/logo192.png" 
            alt="Indian Railways Logo" 
            onError={(e) => { 
              e.target.src = 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23FF9933"/><circle cx="50" cy="50" r="30" fill="white"/><circle cx="50" cy="50" r="20" fill="%231388CE"/><text x="50" y="55" text-anchor="middle" font-size="12" fill="white" font-weight="bold">IR</text></svg>'
              ); 
            }}
          />
        </div>

        <h1>Ministry of Railways</h1>
        <h2>Feedback Management System</h2>
        <p className="login-subtitle">Computerized Housekeeping Monitoring Cell (CMCC)</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              <i className="fa-solid fa-user"></i> Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <i className="fa-solid fa-lock"></i> Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Signing in...
              </>
            ) : (
              <>
                <i className="fa-solid fa-sign-in-alt"></i> Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          {/* <p className="demo-credentials">
            <strong>Demo Credentials:</strong><br/>
            Admin: admin / admin123<br/>
            Officer: officer / officer123
          </p> */}
          <p className="secure-login">
            <i className="fa-solid fa-shield-halved"></i> Secure Government Access
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
