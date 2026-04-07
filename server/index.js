const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { 
  JWT_SECRET, 
  authenticateToken, 
  generateToken, 
  readUsers, 
  writeUsers 
} = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;
const DATA_FILE = path.join(__dirname, 'data', 'feedback.json');

const AREA_KEYS = [
  'appearancePlatform',
  'taps',
  'tracks',
  'waitingHall',
  'toilets',
  'retiringRooms',
  'staffBehavior'
];

// Middleware
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
};

// Read data from JSON file
const readData = () => {
  ensureDataFile();
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
};

// Write data to JSON file
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const createFeedbackSignature = (item = {}) => {
  const areaSignature = AREA_KEYS.map((key) => `${key}:${String(item.areas?.[key] ?? '')}`).join('|');
  return [
    String(item.location || '').toUpperCase(),
    String(item.date || ''),
    String(item.passengerName || '').toLowerCase(),
    String(item.mobile || ''),
    String(item.pnrOrUts || ''),
    areaSignature
  ].join('::');
};

const normalizeRemoteFeedback = (item = {}, fallbackId) => ({
  id: String(item.id || fallbackId),
  location: String(item.location || '').toUpperCase(),
  date: String(item.date || ''),
  fromDate: item.fromDate || '',
  toDate: item.toDate || '',
  passengerName: item.passengerName || '',
  pnrOrUts: item.pnrOrUts || '',
  mobile: item.mobile || '',
  email: item.email || '',
  areas: {
    appearancePlatform: item.areas?.appearancePlatform ?? 0,
    taps: item.areas?.taps ?? 0,
    tracks: item.areas?.tracks ?? 0,
    waitingHall: item.areas?.waitingHall ?? 0,
    toilets: item.areas?.toilets ?? 0,
    retiringRooms: item.areas?.retiringRooms ?? 0,
    staffBehavior: item.areas?.staffBehavior ?? 0
  },
  remarks: item.remarks || '',
  createdAt: item.createdAt || new Date().toISOString()
});

// ======================
// PUBLIC ROUTES (No Auth)
// ======================

// POST /api/auth/login - Admin login (Simplified demo-only)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(`Login attempt: username="${username}", password="${password ? '[HIDDEN]' : 'MISSING'}"`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // // Reliable demo credential matching ONLY
    // const isValidPassword = 
    //   (username === 'admin' && password === 'admin123') ||
    //   (username === 'officer' && password === 'officer123');

    // if (!isValidPassword) {
    //   console.log(`Invalid password for user: ${username}`);
    //   return res.status(401).json({ error: 'Invalid username or password' });
    // }

    console.log(`Login successful for: ${username}`);

    const token = generateToken(user);
    
    res.json({
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

// POST /api/auth/change-password - Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { username } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];
    
    // Verify current password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(currentPassword, user.password);
    } catch (e) {
      isValidPassword = false;
    }

    // Fallback demo credentials even when bcrypt comparison returns false
    if (!isValidPassword) {
      if ((username === 'admin' && currentPassword === 'admin123') ||
          (username === 'officer' && currentPassword === 'officer123')) {
        isValidPassword = true;
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedPassword;
    writeUsers(users);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/auth/verify - Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// POST /api/feedback - Submit new feedback (Public - no auth required for passengers)
app.post('/api/feedback', (req, res) => {
  try {
    const {
      // Passenger details
      passengerName,
      dateOfJourney,
      fromStation,
      toStation,
      ticketNumber,
      mobile,
      email,
      // Feedback entries (array for multiple stations)
      feedbackEntries
    } = req.body;

    // Validate required fields
    if (!passengerName || !dateOfJourney || !fromStation || !toStation || !ticketNumber || !mobile) {
      return res.status(400).json({ error: 'All passenger details are required' });
    }

    const data = readData();

    // Process each feedback entry (one per station)
    const savedFeedbacks = [];
    
    if (feedbackEntries && feedbackEntries.length > 0) {
      for (const entry of feedbackEntries) {
        const newFeedback = {
          id: `FB-${String(data.length + savedFeedbacks.length + 1).padStart(4, '0')}`,
          location: entry.station.toUpperCase(),
          date: dateOfJourney,
          fromDate: fromStation,
          toDate: toStation,
          passengerName,
          pnrOrUts: ticketNumber,
          mobile,
          email: email || '',
          // Map the rating values to the expected format
          areas: {
            appearancePlatform: entry.ratings.platformCleanliness,
            taps: entry.ratings.tapsCleanliness,
            tracks: entry.ratings.tracksCleanliness,
            waitingHall: entry.ratings.waitingHall,
            toilets: entry.ratings.toilets,
            retiringRooms: entry.ratings.retiringRoom,
            staffBehavior: entry.ratings.staffBehavior
          },
          remarks: entry.remarks || '',
          createdAt: new Date().toISOString()
        };
        
        data.push(newFeedback);
        savedFeedbacks.push(newFeedback);
      }
    } else {
      // Create a single entry if no feedback entries
      const newFeedback = {
        id: `FB-${String(data.length + 1).padStart(4, '0')}`,
        location: fromStation.toUpperCase(),
        date: dateOfJourney,
        fromDate: fromStation,
        toDate: toStation,
        passengerName,
        pnrOrUts: ticketNumber,
        mobile,
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

// GET /api/feedback/public - Get feedback by location (Public - no auth required)
app.get('/api/feedback/public', (req, res) => {
  try {
    const { location, date } = req.query;
    let data = readData();
    
    // Filter by location if provided
    if (location) {
      data = data.filter(item => item.location === location.toUpperCase());
    }
    
    // Filter by date if provided
    if (date) {
      data = data.filter(item => item.date === date);
    }
    
    // Sort by date (newest first)
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to fetch feedback data' });
  }
});

// ===========================
// PROTECTED ROUTES (Auth Required)
// ===========================

// GET /api/feedback - Get all feedback with optional filters (Protected)
app.get('/api/feedback', authenticateToken, (req, res) => {
  try {
    const { location, date, fromDate, toDate } = req.query;
    let data = readData();

    // Apply filters
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

const importFeedbackFromRemote = async (sourceUrl) => {
  if (!sourceUrl) {
    throw new Error('Remote URL is required');
  }

  if (typeof fetch !== 'function') {
    throw new Error('Runtime fetch API is not available in this Node version');
  }

  const remoteResponse = await fetch(sourceUrl);
  if (!remoteResponse.ok) {
    throw new Error(`Remote fetch failed with status ${remoteResponse.status}`);
  }

  const remotePayload = await remoteResponse.json();
  const remoteItems = Array.isArray(remotePayload)
    ? remotePayload
    : Array.isArray(remotePayload?.feedbacks)
      ? remotePayload.feedbacks
      : [];

  const existingData = readData();
  const existingSignatures = new Set(existingData.map(createFeedbackSignature));
  const existingIds = new Set(existingData.map((item) => item.id));

  const imported = [];
  const skipped = [];

  for (const item of remoteItems) {
    const normalized = normalizeRemoteFeedback(item, `FB-REMOTE-${uuidv4().slice(0, 8)}`);
    const signature = createFeedbackSignature(normalized);

    if (!normalized.location || !normalized.date || !normalized.passengerName) {
      skipped.push({ id: normalized.id, reason: 'missing_required_fields' });
      continue;
    }

    if (existingSignatures.has(signature)) {
      skipped.push({ id: normalized.id, reason: 'duplicate' });
      continue;
    }

    if (existingIds.has(normalized.id)) {
      normalized.id = `FB-REMOTE-${uuidv4().slice(0, 8)}`;
    }

    existingData.push(normalized);
    existingSignatures.add(signature);
    existingIds.add(normalized.id);
    imported.push(normalized.id);
  }

  writeData(existingData);

  return {
    success: true,
    totalRemoteRecords: remoteItems.length,
    importedCount: imported.length,
    skippedCount: skipped.length,
    importedIds: imported
  };
};

// POST /api/feedback/import-remote - Import feedback from deployed backend (Protected)
app.post('/api/feedback/import-remote', authenticateToken, async (req, res) => {
  try {
    const sourceUrl =
      req.body?.sourceUrl ||
      process.env.REMOTE_FEEDBACK_URL ||
      process.env.RENDER_FEEDBACK_URL;

    if (!sourceUrl) {
      return res.status(400).json({
        error: 'Remote URL is required. Pass sourceUrl in body or set REMOTE_FEEDBACK_URL.'
      });
    }

    const result = await importFeedbackFromRemote(sourceUrl);

    return res.json({
      success: true,
      message: 'Remote feedback import completed',
      sourceUrl,
      ...result
    });
  } catch (error) {
    console.error('Remote feedback import error:', error);
    return res.status(500).json({ error: 'Failed to import remote feedback' });
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
    
    // Calculate average ratings
    let totalAppearance = 0, totalTaps = 0, totalTracks = 0;
    let totalWaiting = 0, totalToilets = 0, totalRetiring = 0, totalStaff = 0;
    
    data.forEach(item => {
      totalAppearance += item.areas?.appearancePlatform || 0;
      totalTaps += item.areas?.taps || 0;
      totalTracks += item.areas?.tracks || 0;
      totalWaiting += item.areas?.waitingHall || 0;
      totalToilets += item.areas?.toilets || 0;
      totalRetiring += item.areas?.retiringRooms || 0;
      totalStaff += item.areas?.staffBehavior || 0;
    });
    
    const count = totalFeedback || 1;
    const averages = {
      platformCleanliness: (totalAppearance / count).toFixed(2),
      tapsCleanliness: (totalTaps / count).toFixed(2),
      tracksCleanliness: (totalTracks / count).toFixed(2),
      waitingHall: (totalWaiting / count).toFixed(2),
      toilets: (totalToilets / count).toFixed(2),
      retiringRooms: (totalRetiring / count).toFixed(2),
      staffBehavior: (totalStaff / count).toFixed(2)
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
  const autoSyncUrl =
    process.env.REMOTE_FEEDBACK_URL ||
    process.env.RENDER_FEEDBACK_URL ||
    'https://railway-feedback-backend.onrender.com/api/feedback/public';
  const intervalMinutes = Number(process.env.REMOTE_SYNC_MINUTES || '1');

  if (intervalMinutes > 0) {
    console.log(
      `Automatic feedback sync enabled. Source: ${autoSyncUrl}, every ${intervalMinutes} minute(s).`
    );

    const runSync = async () => {
      try {
        const result = await importFeedbackFromRemote(autoSyncUrl);
        console.log(
          `[AUTO-SYNC] Imported=${result.importedCount}, Skipped=${result.skippedCount}, TotalRemote=${result.totalRemoteRecords}`
        );
      } catch (err) {
        console.error('[AUTO-SYNC] Failed to import remote feedback:', err.message || err);
      }
    };

    // Initial sync on startup
    runSync();
    // Periodic sync
    setInterval(runSync, intervalMinutes * 60 * 1000);
  } else {
    console.log('Automatic feedback sync is disabled (REMOTE_SYNC_MINUTES=0).');
  }
});
