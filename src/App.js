import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import FeedbackForm from './FeedbackForm';
import Login from './Login';
import Signup from './Signup';
import AdminDashboard from './AdminDashboard';

// Protected Route Component
function ProtectedRoute({ children, requiredStation }) {
  const { isAuthenticated, loading, user } = useAuth();
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
    // User is not logged in - redirect to the station's login page
    if (requiredStation) {
      // Store the intended destination for redirect after login
      localStorage.setItem('redirectAfterLogin', `/feedback/${requiredStation.toLowerCase()}`);
      localStorage.setItem('selectedStation', requiredStation.toUpperCase());
      return <Navigate to={`/${requiredStation.toLowerCase()}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }
  
  // User is authenticated - check if they can access this station's feedback form
  if (requiredStation && user) {
    const userStation = user.station?.toUpperCase();
    const requiredStationUpper = requiredStation.toUpperCase();
    
    // Check if user's station matches the required station
    if (userStation !== requiredStationUpper) {
      // User is logged in but trying to access wrong station's feedback
      // Redirect to their own station's feedback form
      if (userStation === 'RAICHUR') {
        return <Navigate to="/feedback/raichur" replace />;
      } else if (userStation === 'YADGIR') {
        return <Navigate to="/feedback/yadgir" replace />;
      } else {
        // No valid station - redirect to login
        return <Navigate to="/login" replace />;
      }
    }
  }
  
  return children;
}

// StationSaver component - saves station from URL to localStorage for login redirect
function StationSaver({ station }) {
  React.useEffect(() => {
    if (station) {
      localStorage.setItem('selectedStation', station.toUpperCase());
    }
  }, [station]);
  
  return null;
}

// Login handler component
function LoginHandler({ station: stationProp }) {
  const navigate = useNavigate();
  const [showSignup, setShowSignup] = useState(false);
  
  // Save station to localStorage when component mounts (for /raichur or /yadgir routes)
  React.useEffect(() => {
    if (stationProp) {
      localStorage.setItem('selectedStation', stationProp.toUpperCase());
    }
  }, [stationProp]);
  
  const handleLoginSuccess = () => {
    // First priority: Check if there's a stored redirect URL from ProtectedRoute
    const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
    
    if (redirectAfterLogin) {
      // Clear the redirect URL and navigate to the protected page
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectAfterLogin);
      return;
    }
    
    // Second priority: Get station from localStorage (set when visiting /raichur or /yadgir)
    const selectedStation = localStorage.getItem('selectedStation');
    
    // Third priority: Check user data for backward compatibility
    const userData = localStorage.getItem('user');
    let userStation = null;
    
    if (userData) {
      const user = JSON.parse(userData);
      userStation = user.station?.toLowerCase();
    }
    
    // Priority: selectedStation from URL > user.station from database
    const redirectStation = selectedStation || userStation;
    
    // Redirect based on station
    if (redirectStation === 'raichur' || redirectStation === 'RAICHUR') {
      navigate('/feedback/raichur');
    } else if (redirectStation === 'yadgir' || redirectStation === 'YADGIR') {
      navigate('/feedback/yadgir');
    } else {
      navigate('/feedback');
    }
    
    // Clear selectedStation after use
    localStorage.removeItem('selectedStation');
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
        {/* Public route for passengers - separate links for each station with login */}
        <Route path="/raichur" element={<LoginHandler station="RAICHUR" />} />
        <Route path="/yadgir" element={<LoginHandler station="YADGIR" />} />
        
        {/* Protected route for passengers to submit feedback - requires authentication */}
        <Route path="/feedback/:station" element={
          <ProtectedRoute requiredStation=":station">
            <FeedbackForm />
          </ProtectedRoute>
        } />
        
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
