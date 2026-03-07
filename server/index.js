const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cmcc-secret-key-2024';
const DATA_FILE = path.join(__dirname, 'data', 'feedback.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Hardcoded admin credentials
const ADMIN_CREDENTIALS = {
  username: 'raichu@1234',
  password: 'Raichu9876@'
};

app.use(cors());
app.use(express.json());

// Ensure data directory and file exist
const ensureDataFile = () => {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      { id: '1', username: 'raichur@1234', password: '$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLhJ3W7u', role: 'admin', name: 'Raichur Admin' }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
  }
};

const readData = () => {
  ensureDataFile();
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const readUsers = () => {
  ensureDataFile();
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ======================
// PUBLIC ROUTES
// ======================

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }
    
    const users = readUsers();
    
    // Check if username already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: String(users.length + 1),
      username,
      password: hashedPassword,
      role: 'user',
      name
    };
    
    users.push(newUser);
    writeUsers(users);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check hardcoded admin credentials first
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const token = generateToken({
        id: '1',
        username: ADMIN_CREDENTIALS.username,
        role: 'admin',
        name: 'Raichur Admin'
      });
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: '1',
          username: ADMIN_CREDENTIALS.username,
          role: 'admin',
          name: 'Raichur Admin'
        }
      });
    }
    
    // Check database users
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
      isValidPassword = false;
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/verify
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/feedback - Submit feedback (Public - no auth required)
app.post('/api/feedback', (req, res) => {
  try {
    const {
      passengerName,
      dateOfJourney,
      ticketNumber,
      mobile,
      feedbackEntries,
      fromStation,
      toStation,
      email
    } = req.body;
    
    if (!passengerName || !dateOfJourney || !ticketNumber || !mobile) {
      return res.status(400).json({ error: 'Passenger Name, Date of Journey, Ticket Number, and Mobile are required' });
    }
    
    const data = readData();
    const savedFeedbacks = [];
    
    if (feedbackEntries && feedbackEntries.length > 0) {
      for (const entry of feedbackEntries) {
        const newFeedback = {
          id: `FB-${String(data.length + savedFeedbacks.length + 1).padStart(4, '0')}`,
          location: entry.station.toUpperCase(),
          date: dateOfJourney,
          passengerName,
          pnrOrUts: ticketNumber,
          mobile,
          fromStation: fromStation || '',
          toStation: toStation || '',
          email: email || '',
          areas: {
            appearancePlatform: entry.ratings.platformCleanliness,
            taps: entry.ratings.tapsCleanliness,
            tracks: entry.ratings.tracksCleanliness,
            waitingHall: entry.ratings.waitingHall,
            toilets: entry.ratings.toilets,
            retiringRooms: entry.ratings.retiringRoom,
            staffBehavior: entry.ratings.staffBehavior
          },
          overallRating: entry.overallRating || 0,
          remarks: entry.remarks || '',
          createdAt: new Date().toISOString()
        };
        
        data.push(newFeedback);
        savedFeedbacks.push(newFeedback);
      }
    } else {
      const newFeedback = {
        id: `FB-${String(data.length + 1).padStart(4, '0')}`,
        location: 'RAICHUR',
        date: dateOfJourney,
        passengerName,
        pnrOrUts: ticketNumber,
        mobile,
        fromStation: fromStation || '',
        toStation: toStation || '',
        email: email || '',
        areas: {
          appearancePlatform: 0,
          taps: 0,
          tracks: 0,
          waitingHall: 0,
          toilets: 0,
          retiringRooms: 0,
          staffBehavior: 0
        },
        overallRating: 0,
        remarks: '',
        createdAt: new Date().toISOString()
      };
      
      data.push(newFeedback);
      savedFeedbacks.push(newFeedback);
    }
    
    writeData(data);
    res.status(201).json({ 
      success: true, 
      message: 'Feedback submitted successfully',
      feedbacks: savedFeedbacks
    });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// GET /api/feedback/locations - Get unique locations (Public)
app.get('/api/feedback/locations', (req, res) => {
  try {
    const data = readData();
    const locations = [...new Set(data.map(item => item.location))];
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// ===========================
// PROTECTED ROUTES (Auth Required)
// ===========================

// GET /api/feedback - Get all feedback with filters (Protected)
app.get('/api/feedback', authenticateToken, (req, res) => {
  try {
    const { location, date, fromDate, toDate } = req.query;
    let data = readData();
    
    if (location) {
      data = data.filter(item => item.location === location);
    }
    if (date) {
      data = data.filter(item => item.date === date);
    }
    if (fromDate && toDate) {
      data = data.filter(item => item.date >= fromDate && item.date <= toDate);
    }
    if (fromDate && !toDate) {
      data = data.filter(item => item.date >= fromDate);
    }
    if (!fromDate && toDate) {
      data = data.filter(item => item.date <= toDate);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to fetch feedback data' });
  }
});

// DELETE /api/feedback/:id - Delete feedback (Protected - Admin only)
app.delete('/api/feedback/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete feedback' });
    }
    
    const { id } = req.params;
    const data = readData();
    const initialLength = data.length;
    
    const newData = data.filter(item => item.id !== id);
    
    if (newData.length === initialLength) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    writeData(newData);
    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// GET /api/stats - Get statistics (Protected)
app.get('/api/stats', authenticateToken, (req, res) => {
  try {
    const data = readData();
    const totalFeedback = data.length;
    const locations = [...new Set(data.map(item => item.location))];
    
    let totalAppearance = 0, totalTaps = 0, totalTracks = 0;
    let totalWaiting = 0, totalToilets = 0, totalRetiring = 0, totalStaff = 0;
    let totalOverallRating = 0;
    
    data.forEach(item => {
      totalAppearance += item.areas?.appearancePlatform || 0;
      totalTaps += item.areas?.taps || 0;
      totalTracks += item.areas?.tracks || 0;
      totalWaiting += item.areas?.waitingHall || 0;
      totalToilets += item.areas?.toilets || 0;
      totalRetiring += item.areas?.retiringRooms || 0;
      totalStaff += item.areas?.staffBehavior || 0;
      totalOverallRating += item.overallRating || 0;
    });
    
    const count = totalFeedback || 1;
    const averages = {
      platformCleanliness: (totalAppearance / count).toFixed(2),
      tapsCleanliness: (totalTaps / count).toFixed(2),
      tracksCleanliness: (totalTracks / count).toFixed(2),
      waitingHall: (totalWaiting / count).toFixed(2),
      toilets: (totalToilets / count).toFixed(2),
      retiringRooms: (totalRetiring / count).toFixed(2),
      staffBehavior: (totalStaff / count).toFixed(2),
      overallRating: (totalOverallRating / count).toFixed(2)
    };
    
    res.json({
      totalFeedback,
      locationsCount: locations.length,
      locations,
      averages,
      recentFeedback: data.slice(-10).reverse()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Base: http://localhost:${PORT}/api`);
  ensureDataFile();
});
