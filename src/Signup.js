import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import './Login.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

function Signup({ onSignupSuccess, onLoginClick }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !password || !name) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setSuccess('Account created successfully! Please login.');
      setTimeout(() => {
        if (onLoginClick) onLoginClick();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Sign Up</h2>

        {error && (
          <div className="error-message">
            <i className="fa-solid fa-triangle-exclamation"></i> {error}
          </div>
        )}

        {success && (
          <div className="success-message" style={{
            background: '#d1fae5',
            border: '1px solid #a7f3d0',
            color: '#059669',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '13px'
          }}>
            <i className="fa-solid fa-check-circle"></i> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Full Name</label>
            <input 
              type="text" 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
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
              placeholder="Create a password"
              required
            />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <i className="fa-solid fa-spinner"></i> Creating account...
              </>
            ) : (
              <>
                <i className="fa-solid fa-user-plus"></i> Sign Up
              </>
            )}
          </button>
        </form>

        <div className="signup-link">
          Already have an account?
          <a href="#" onClick={(e) => {
            e.preventDefault();
            if (onLoginClick) onLoginClick();
          }}>
            Login
          </a>
        </div>
      </div>
    </div>
  );
}

export default Signup;
