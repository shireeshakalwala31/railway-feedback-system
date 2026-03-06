import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import './Login.css';

function Login({ onLoginSuccess, onSignupClick }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="login-card">
        <div className="login-logo">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Indian_Railways_logo.png/220px-Indian_Railways_logo.png" 
            alt="RRB Logo"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        
        <div className="train-animation">
          <i className="fa-solid fa-train moving-train"></i>
        </div>
        
        <h1 className="login-subtitle">Passenger Feedback Form</h1>

        {error && (
          <div className="error-message">
            <i className="fa-solid fa-triangle-exclamation"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <i className="fa-solid fa-spinner"></i> Logging in...
              </>
            ) : (
              <>
                <i className="fa-solid fa-sign-in-alt"></i> Login
              </>
            )}
          </button>
        </form>

        <div className="signup-link">
          Don't have an account?
          <a href="#" onClick={(e) => {
            e.preventDefault();
            if (onSignupClick) onSignupClick();
          }}>
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
