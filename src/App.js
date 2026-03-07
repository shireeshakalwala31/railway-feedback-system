import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import FeedbackForm from './FeedbackForm';
import Login from './Login';
import Signup from './Signup';
import AdminDashboard from './AdminDashboard';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72, #2a5298)' 
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            border: '4px solid rgba(255,255,255,0.3)', 
            borderTop: '4px solid white', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite', 
            margin: '0 auto 20px' 
          }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Login handler component
function LoginHandler() {
  const navigate = useNavigate();
  const [showSignup, setShowSignup] = useState(false);
  
  const handleLoginSuccess = () => {
    navigate('/feedback');
  };
  
  const handleSignupClick = () => {
    setShowSignup(true);
  };
  
  const handleLoginClick = () => {
    setShowSignup(false);
  };
  
  if (showSignup) {
    return <Signup onLoginClick={handleLoginClick} />;
  }
  
  return <Login onLoginSuccess={handleLoginSuccess} onSignupClick={handleSignupClick} />;
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public route for passengers - direct links for each station (no login needed) */}
        <Route path="/raichur" element={<FeedbackForm station="RAICHUR" />} />
        <Route path="/yadgir" element={<FeedbackForm station="YADGIR" />} />
        
        {/* Public route for passengers to submit feedback - supports multiple stations via URL parameter */}
        <Route path="/feedback/:station" element={<FeedbackForm />} />
        
        {/* Public route for login */}
        <Route path="/login" element={<LoginHandler />} />
        
        {/* Protected admin dashboard */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        {/* Default route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
