const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'ministry-of-railways-secret-key-2024';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Read users from file
const readUsers = () => {
  const usersFile = path.join(__dirname, '..', 'data', 'users.json');
  if (!fs.existsSync(usersFile)) {
    return [];
  }
  const data = fs.readFileSync(usersFile, 'utf-8');
  return JSON.parse(data);
};

// Write users to file
const writeUsers = (users) => {
  const usersFile = path.join(__dirname, '..', 'data', 'users.json');
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

module.exports = {
  JWT_SECRET,
  authenticateToken,
  generateToken,
  readUsers,
  writeUsers
};
