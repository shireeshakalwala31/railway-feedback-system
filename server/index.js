require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shireesha.k@amazonitsolutions.in';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ============================================================
// NODEMAILER TRANSPORTER
// ============================================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false }
});

// Helper: send email (logs to console if SMTP not configured)
const sendEmail = async ({ to, subject, html }) => {
  const fromName = 'Aisrailindia Portal';
  const fromEmail = process.env.SMTP_USER || 'noreply@aisrailindia.in';

  console.log(`[EMAIL] Sending to: ${to} | Subject: ${subject}`);

  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-gmail@gmail.com') {
    console.warn('[EMAIL] ⚠️  SMTP not configured — email NOT sent. Configure .env to enable.');
    console.log(`[EMAIL CONTENT]\nTo: ${to}\nSubject: ${subject}\n---`);
    return { skipped: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] ✅ Sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL] ❌ Failed:', err.message);
    return { error: err.message };
  }
};

const AREA_KEYS = [
  'appearancePlatform', 'taps', 'tracks', 'waitingHall',
  'toilets', 'retiringRooms', 'staffBehavior'
];

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================
// DATA HELPERS
// ============================================================
const ensureDataFile = () => {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
};

const readData = () => {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Generate 6-digit numeric OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// Mask email: abc***@domain.com
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '****@****.***';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
};

// ============================================================
// EMAIL TEMPLATES
// ============================================================
const emailTemplates = {
  registrationToAdmin: ({ name, employeeId, email, phone, stationName, stationCode, approveUrl, denyUrl }) => ({
    subject: `[Aisrailindia] New Station Admin Registration — ${name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#f97316;font-size:24px;margin:0;">🚉 Aisrailindia</h1>
          <p style="color:#94a3b8;margin:4px 0 0 0;">Station Admin Registration Request</p>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:20px;">
          <h2 style="color:#f97316;margin:0 0 16px 0;font-size:16px;">New Registration Details</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#94a3b8;width:140px;">Name</td><td style="color:#fff;font-weight:bold;">${name}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;">Employee ID</td><td style="color:#fff;">${employeeId}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;">Email</td><td style="color:#fff;">${email}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;">Phone</td><td style="color:#fff;">${phone}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;">Station</td><td style="color:#fff;">${stationName} (${stationCode})</td></tr>
          </table>
        </div>
        <p style="color:#94a3b8;text-align:center;margin-bottom:20px;">Please review and take action:</p>
        <div style="display:flex;gap:16px;justify-content:center;text-align:center;">
          <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin-right:12px;">✅ APPROVE</a>
          <a href="${denyUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">❌ DENY</a>
        </div>
        <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">Aisrailindia Portal · Ministry of Railways · Government of India</p>
      </div>
    `
  }),

  credentialsToUser: ({ name, username, password, stationName, loginUrl }) => ({
    subject: `[Aisrailindia] Your Login Credentials — Access Approved`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#f97316;font-size:24px;margin:0;">🚉 Aisrailindia</h1>
          <p style="color:#94a3b8;margin:4px 0 0 0;">Station Admin Portal</p>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">✅</div>
          <h2 style="color:#4ade80;margin:0 0 8px 0;">Access Approved!</h2>
          <p style="color:#94a3b8;margin:0;">Dear ${name}, your registration for <strong style="color:#f97316;">${stationName}</strong> has been approved.</p>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#f97316;margin:0 0 16px 0;font-size:14px;">🔐 YOUR LOGIN CREDENTIALS</h3>
          <div style="background:#0f172a;border-radius:6px;padding:14px;margin-bottom:10px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">Username</p>
            <p style="margin:4px 0 0 0;color:#fff;font-size:20px;font-family:monospace;font-weight:bold;">${username}</p>
          </div>
          <div style="background:#0f172a;border-radius:6px;padding:14px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">Password</p>
            <p style="margin:4px 0 0 0;color:#f97316;font-size:20px;font-family:monospace;font-weight:bold;">${password}</p>
          </div>
        </div>
        <div style="background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:8px;padding:14px;margin-bottom:20px;">
          <p style="margin:0;color:#fbbf24;font-size:13px;">⚠️ Please change your password after your first login for security.</p>
        </div>
        <div style="text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Login Now →</a>
        </div>
        <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">Aisrailindia Portal · Ministry of Railways · Government of India</p>
      </div>
    `
  }),

  deniedToUser: ({ name, stationName }) => ({
    subject: `[Aisrailindia] Registration Status Update`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#f97316;font-size:24px;margin:0;">🚉 Aisrailindia</h1>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:20px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">❌</div>
          <h2 style="color:#f87171;margin:0 0 8px 0;">Registration Not Approved</h2>
          <p style="color:#94a3b8;">Dear ${name}, your registration request for <strong style="color:#f97316;">${stationName}</strong> was not approved at this time.</p>
          <p style="color:#94a3b8;">Please contact your railway division administrator for assistance.</p>
        </div>
        <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">Aisrailindia Portal · Ministry of Railways · Government of India</p>
      </div>
    `
  }),

  otpEmail: ({ name, otp, stationName }) => ({
    subject: `[Aisrailindia] Your OTP: ${otp}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#f97316;font-size:24px;margin:0;">🚉 Aisrailindia</h1>
          <p style="color:#94a3b8;margin:4px 0 0 0;">Secure Login Verification</p>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:24px;text-align:center;">
          <p style="color:#94a3b8;margin:0 0 8px 0;">Hello ${name}, your one-time password for ${stationName} login is:</p>
          <div style="background:#0f172a;border-radius:8px;padding:20px;margin:16px 0;border:2px dashed rgba(249,115,22,0.4);">
            <span style="font-size:42px;font-family:monospace;letter-spacing:12px;color:#f97316;font-weight:bold;">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0;">This OTP is valid for <strong style="color:#fff;">10 minutes</strong>. Do not share it with anyone.</p>
        </div>
        <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">Aisrailindia Portal · Ministry of Railways · Government of India</p>
      </div>
    `
  }),

  resetPasswordEmail: ({ name, resetUrl }) => ({
    subject: `[Aisrailindia] Password Reset Request`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#f97316;font-size:24px;margin:0;">🚉 Aisrailindia</h1>
          <p style="color:#94a3b8;margin:4px 0 0 0;">Password Reset</p>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:20px;">
          <p style="color:#94a3b8;margin:0 0 12px 0;">Hello ${name},</p>
          <p style="color:#e2e8f0;margin:0 0 12px 0;">We received a request to reset your Aisrailindia portal password. Click the button below to set a new password:</p>
          <div style="text-align:center;margin:20px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Reset My Password →</a>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0;">This link expires in <strong style="color:#fff;">30 minutes</strong>. If you didn't request this, ignore this email.</p>
        </div>
        <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">Aisrailindia Portal · Ministry of Railways · Government of India</p>
      </div>
    `
  }),
};

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/register — Station admin registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, employeeId, email, phone, stationCode, stationName } = req.body;

    if (!name || !employeeId || !email || !phone || !stationCode || !stationName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const users = readUsers();

    // Check for duplicates
    if (users.find(u => u.employeeId === employeeId)) {
      return res.status(409).json({ error: 'Employee ID already registered.' });
    }
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email address already registered.' });
    }

    const approvalToken = uuidv4();
    const denyToken = uuidv4();

    const newUser = {
      id: `USR-${String(users.length + 1).padStart(4, '0')}`,
      name,
      employeeId,
      username: null,       // set on approval
      password: null,       // set on approval
      email,
      phone,
      stationCode,
      stationName,
      role: 'station_admin',
      status: 'pending',    // pending | approved | denied
      otp: null,
      otpExpires: null,
      resetToken: null,
      resetTokenExpires: null,
      approvalToken,
      denyToken,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    // Send notification email to admin
    const approveUrl = `${FRONTEND_URL.replace(/\/$/, '')}/api/auth/approve/${approvalToken}`;
    const denyUrl = `${FRONTEND_URL.replace(/\/$/, '')}/api/auth/deny/${denyToken}`;
    // Use backend URL for action links
    const backendBase = `http://localhost:${PORT}`;
    const approveLink = `${backendBase}/api/auth/approve/${approvalToken}`;
    const denyLink = `${backendBase}/api/auth/deny/${denyToken}`;

    const tmpl = emailTemplates.registrationToAdmin({ name, employeeId, email, phone, stationName, stationCode, approveUrl: approveLink, denyUrl: denyLink });
    await sendEmail({ to: ADMIN_EMAIL, ...tmpl });

    console.log(`[REGISTER] New registration: ${name} (${employeeId}) — ${stationName}`);
    console.log(`[REGISTER] Approve: ${approveLink}`);
    console.log(`[REGISTER] Deny: ${denyLink}`);

    res.status(201).json({
      success: true,
      message: `Your registration has been submitted! An admin will review your details and send your login credentials to ${email} once approved.`
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// GET /api/auth/approve/:token — Admin clicks approve link
app.get('/api/auth/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const users = readUsers();
    const userIndex = users.findIndex(u => u.approvalToken === token);

    if (userIndex === -1) {
      return res.status(404).send('<h2 style="font-family:Arial">❌ Invalid or expired approval link.</h2>');
    }

    const user = users[userIndex];

    if (user.status === 'approved') {
      return res.send(`<h2 style="font-family:Arial">✅ ${user.name} is already approved.</h2>`);
    }

    // Generate username and password
    const stationPrefix = user.stationCode.toLowerCase();
    const username = `${stationPrefix}@${Math.floor(1000 + Math.random() * 9000)}`;
    const plainPassword = `${user.stationCode}${Math.floor(10000 + Math.random() * 90000)}@IR`;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    users[userIndex] = {
      ...user,
      username,
      password: hashedPassword,
      status: 'approved',
      approvalToken: null, // invalidate token
    };
    writeUsers(users);

    console.log(`[APPROVE] ✅ Approved: ${user.name} | username: ${username} | password: ${plainPassword}`);

    // Send credentials to user
    const tmpl = emailTemplates.credentialsToUser({
      name: user.name,
      username,
      password: plainPassword,
      stationName: user.stationName,
      loginUrl: `${FRONTEND_URL}/station-login`,
    });
    await sendEmail({ to: user.email, ...tmpl });

    res.send(`
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:60px auto;text-align:center;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
        <div style="font-size:64px;">✅</div>
        <h2 style="color:#4ade80;">Approved!</h2>
        <p style="color:#94a3b8;">${user.name}'s registration has been approved.</p>
        <p style="color:#94a3b8;">Login credentials have been sent to <strong style="color:#f97316;">${user.email}</strong>.</p>
        <div style="background:#1e293b;border-radius:8px;padding:14px;margin-top:20px;">
          <p style="margin:0;color:#94a3b8;font-size:13px;">Username: <strong style="color:#fff;font-family:monospace;">${username}</strong></p>
          <p style="margin:8px 0 0 0;color:#94a3b8;font-size:13px;">Password: <strong style="color:#f97316;font-family:monospace;">${plainPassword}</strong></p>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:24px;">You can close this window.</p>
      </div>
    `);
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).send('<h2 style="font-family:Arial">Server error. Please try again.</h2>');
  }
});

// GET /api/auth/deny/:token — Admin clicks deny link
app.get('/api/auth/deny/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const users = readUsers();
    const userIndex = users.findIndex(u => u.denyToken === token);

    if (userIndex === -1) {
      return res.status(404).send('<h2 style="font-family:Arial">❌ Invalid or expired deny link.</h2>');
    }

    const user = users[userIndex];

    if (user.status === 'denied') {
      return res.send(`<h2 style="font-family:Arial">Already denied: ${user.name}</h2>`);
    }

    users[userIndex] = { ...user, status: 'denied', denyToken: null };
    writeUsers(users);

    console.log(`[DENY] ❌ Denied: ${user.name}`);

    // Notify user
    const tmpl = emailTemplates.deniedToUser({ name: user.name, stationName: user.stationName });
    await sendEmail({ to: user.email, ...tmpl });

    res.send(`
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:60px auto;text-align:center;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
        <div style="font-size:64px;">❌</div>
        <h2 style="color:#f87171;">Registration Denied</h2>
        <p style="color:#94a3b8;">${user.name}'s registration has been denied.</p>
        <p style="color:#94a3b8;">A notification has been sent to <strong style="color:#f97316;">${user.email}</strong>.</p>
        <p style="color:#475569;font-size:12px;margin-top:24px;">You can close this window.</p>
      </div>
    `);
  } catch (error) {
    console.error('Deny error:', error);
    res.status(500).send('<h2 style="font-family:Arial">Server error.</h2>');
  }
});

// POST /api/auth/login — Step 1: verify credentials, send OTP
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = users[userIndex];

    // Check approval status
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval. You will receive credentials by email once approved.' });
    }
    if (user.status === 'denied') {
      return res.status(403).json({ error: 'Your registration was not approved. Please contact your railway division administrator.' });
    }
    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Account not active. Contact administrator.' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    users[userIndex] = { ...user, otp, otpExpires };
    writeUsers(users);

    console.log(`[LOGIN] ✅ Credentials verified for: ${username}`);
    console.log(`[OTP] 🔑 OTP for ${username}: ${otp} (expires: ${otpExpires})`);

    // Send OTP email
    const tmpl = emailTemplates.otpEmail({ name: user.name, otp, stationName: user.stationName });
    const emailResult = await sendEmail({ to: user.email, ...tmpl });

    res.json({
      success: true,
      message: 'Credentials verified. OTP sent to your registered email.',
      maskedEmail: maskEmail(user.email),
      maskedPhone: user.phone ? `${'*'.repeat(user.phone.length - 4)}${user.phone.slice(-4)}` : null,
      // Only include demoOtp if SMTP not configured (dev mode)
      demoOtp: (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-gmail@gmail.com') ? otp : undefined,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/verify-otp — Step 2: verify OTP, issue JWT
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { username, otp } = req.body;

    if (!username || !otp) {
      return res.status(400).json({ error: 'Username and OTP are required.' });
    }

    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ error: 'No OTP found. Please log in again.' });
    }

    // Check expiry
    if (new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({ error: 'OTP has expired. Please log in again to receive a new OTP.' });
    }

    // Check OTP match
    if (otp.trim() !== user.otp) {
      return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
    }

    // Clear OTP after successful use
    const userIndex = users.findIndex(u => u.username === username);
    users[userIndex] = { ...user, otp: null, otpExpires: null };
    writeUsers(users);

    // Issue JWT
    const token = generateToken(user);

    console.log(`[OTP] ✅ OTP verified for: ${username}`);

    // Determine station data for frontend
    const STATION_MAP = {
      'RCR': { id: 'raichur', name: 'Raichur Railway Station', code: 'RCR' },
      'YG':  { id: 'yadgir',  name: 'Yadgir Railway Station',  code: 'YG'  },
    };
    const station = STATION_MAP[user.stationCode] || {
      id: user.stationCode.toLowerCase(),
      name: user.stationName,
      code: user.stationCode
    };

    res.json({
      success: true,
      token,
      station,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/resend-otp — Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[userIndex];

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    users[userIndex] = { ...user, otp, otpExpires };
    writeUsers(users);

    console.log(`[RESEND OTP] 🔑 New OTP for ${username}: ${otp}`);

    const tmpl = emailTemplates.otpEmail({ name: user.name, otp, stationName: user.stationName });
    await sendEmail({ to: user.email, ...tmpl });

    res.json({
      success: true,
      message: 'A new OTP has been sent to your email.',
      demoOtp: (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-gmail@gmail.com') ? otp : undefined,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

// POST /api/auth/forgot-password — Send reset link
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.email === email);

    // Always respond with success to prevent user enumeration
    if (userIndex === -1) {
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const user = users[userIndex];
    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

    users[userIndex] = { ...user, resetToken, resetTokenExpires };
    writeUsers(users);

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`[FORGOT PASSWORD] Reset link for ${email}: ${resetUrl}`);

    const tmpl = emailTemplates.resetPasswordEmail({ name: user.name, resetUrl });
    await sendEmail({ to: user.email, ...tmpl });

    res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset email.' });
  }
});

// POST /api/auth/reset-password — Reset password using token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.resetToken === token);

    if (userIndex === -1) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    const user = users[userIndex];

    if (new Date() > new Date(user.resetTokenExpires)) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex] = {
      ...user,
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    };
    writeUsers(users);

    console.log(`[RESET PASSWORD] ✅ Password reset for: ${user.username}`);

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/auth/change-password — Change password (authenticated)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { username } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[userIndex];
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex] = { ...user, password: hashedPassword };
    writeUsers(users);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// GET /api/auth/verify — Verify JWT token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ============================================================
// FEEDBACK ROUTES
// ============================================================

const AREA_KEYS_SET = new Set(AREA_KEYS);

// POST /api/feedback — Submit new feedback (Public)
app.post('/api/feedback', (req, res) => {
  try {
    const { passengerName, dateOfJourney, fromStation, toStation, ticketNumber, mobile, email, feedbackEntries } = req.body;

    if (!passengerName || !dateOfJourney || !fromStation || !toStation || !ticketNumber || !mobile) {
      return res.status(400).json({ error: 'All passenger details are required.' });
    }

    const data = readData();
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
        areas: { appearancePlatform: 0, taps: 0, tracks: 0, waitingHall: 0, toilets: 0, retiringRooms: 0, staffBehavior: 0 },
        remarks: '',
        createdAt: new Date().toISOString()
      };
      data.push(newFeedback);
      savedFeedbacks.push(newFeedback);
    }

    writeData(data);
    res.status(201).json({ success: true, message: 'Feedback submitted successfully.', feedbacks: savedFeedbacks });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

// GET /api/feedback/locations
app.get('/api/feedback/locations', (req, res) => {
  try {
    const data = readData();
    const locations = [...new Set(data.map(item => item.location))];
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch locations.' });
  }
});

// GET /api/feedback/public — Public endpoint (supports RCR/RAICHUR and YG/YADGIR aliases)
app.get('/api/feedback/public', (req, res) => {
  try {
    const { location, date } = req.query;
    let data = readData();
    if (location) {
      const loc = location.toUpperCase().trim();
      const aliasMap = {
        'RCR': ['RCR', 'RAICHUR'], 'YG': ['YG', 'YADGIR'],
        'RAICHUR': ['RCR', 'RAICHUR'], 'YADGIR': ['YG', 'YADGIR'],
      };
      const valid = aliasMap[loc] || [loc];
      data = data.filter(item => valid.includes((item.location || '').toUpperCase()));
    }
    if (date) data = data.filter(item => item.date === date);
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback data.' });
  }
});

// GET /api/feedback — Protected, only Raichur + Yadgir
app.get('/api/feedback', authenticateToken, (req, res) => {
  try {
    const { location, date, fromDate, toDate } = req.query;
    let data = readData();

    // ⭐ Only serve Raichur (RCR) and Yadgir (YG) data
    data = data.filter(item => item.location === 'RCR' || item.location === 'RAICHUR' ||
                                item.location === 'YG' || item.location === 'YADGIR');

    if (location) data = data.filter(item => item.location === location.toUpperCase());
    if (date) data = data.filter(item => item.date === date);
    if (fromDate && toDate) data = data.filter(item => item.date >= fromDate && item.date <= toDate);
    else if (fromDate) data = data.filter(item => item.date >= fromDate);
    else if (toDate) data = data.filter(item => item.date <= toDate);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback data.' });
  }
});

// DELETE /api/feedback/:id — Protected, admin only
app.delete('/api/feedback/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'station_admin') {
      return res.status(403).json({ error: 'Not authorized to delete feedback.' });
    }
    const { id } = req.params;
    const data = readData();
    const newData = data.filter(item => item.id !== id);
    if (newData.length === data.length) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }
    writeData(newData);
    res.json({ success: true, message: 'Feedback deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete feedback.' });
  }
});

// GET /api/stats — Protected
app.get('/api/stats', authenticateToken, (req, res) => {
  try {
    let data = readData();
    // Filter to Raichur and Yadgir only
    data = data.filter(item => item.location === 'RCR' || item.location === 'RAICHUR' ||
                                item.location === 'YG'  || item.location === 'YADGIR');

    const totalFeedback = data.length;
    const locations = [...new Set(data.map(item => item.location))];
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
    res.json({
      totalFeedback, locationsCount: locations.length, locations,
      averages: {
        platformCleanliness: (totalAppearance / count).toFixed(2),
        tapsCleanliness: (totalTaps / count).toFixed(2),
        tracksCleanliness: (totalTracks / count).toFixed(2),
        waitingHall: (totalWaiting / count).toFixed(2),
        toilets: (totalToilets / count).toFixed(2),
        retiringRooms: (totalRetiring / count).toFixed(2),
        staffBehavior: (totalStaff / count).toFixed(2),
      },
      recentFeedback: data.slice(-10).reverse()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

// ============================================================
// REMOTE SYNC
// ============================================================
const createFeedbackSignature = (item = {}) => {
  const areaSignature = AREA_KEYS.map(key => `${key}:${String(item.areas?.[key] ?? '')}`).join('|');
  return [String(item.location || '').toUpperCase(), String(item.date || ''), String(item.passengerName || '').toLowerCase(), String(item.mobile || ''), String(item.pnrOrUts || ''), areaSignature].join('::');
};

const normalizeRemoteFeedback = (item = {}, fallbackId) => ({
  id: String(item.id || fallbackId),
  location: String(item.location || '').toUpperCase(),
  date: String(item.date || ''),
  fromDate: item.fromDate || '', toDate: item.toDate || '',
  passengerName: item.passengerName || '', pnrOrUts: item.pnrOrUts || '',
  mobile: item.mobile || '', email: item.email || '',
  areas: {
    appearancePlatform: item.areas?.appearancePlatform ?? 0,
    taps: item.areas?.taps ?? 0, tracks: item.areas?.tracks ?? 0,
    waitingHall: item.areas?.waitingHall ?? 0, toilets: item.areas?.toilets ?? 0,
    retiringRooms: item.areas?.retiringRooms ?? 0, staffBehavior: item.areas?.staffBehavior ?? 0,
  },
  remarks: item.remarks || '', createdAt: item.createdAt || new Date().toISOString()
});

const fetchRemoteFeedbackData = async (sourceUrl) => {
  const directResponse = await fetch(sourceUrl);
  if (directResponse.ok) return directResponse.json();
  if ([401, 403, 404].includes(directResponse.status)) {
    const baseUrl = sourceUrl.replace(/\/api\/feedback(?:\/public)?(?:\?.*)?$/i, '');
    const credCandidates = [
      { username: process.env.REMOTE_AUTH_USERNAME, password: process.env.REMOTE_AUTH_PASSWORD },
    ].filter(c => c.username && c.password);
    for (const creds of credCandidates) {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds) });
      if (!loginRes.ok) continue;
      const { token } = await loginRes.json();
      if (!token) continue;
      const protectedRes = await fetch(`${baseUrl}/api/feedback`, { headers: { Authorization: `Bearer ${token}` } });
      if (protectedRes.ok) return protectedRes.json();
    }
  }
  throw new Error(`Remote fetch failed: ${directResponse.status}`);
};

const importFeedbackFromRemote = async (sourceUrl) => {
  if (!sourceUrl) throw new Error('Remote URL is required');
  if (typeof fetch !== 'function') throw new Error('fetch API not available');
  const remotePayload = await fetchRemoteFeedbackData(sourceUrl);
  const remoteItems = Array.isArray(remotePayload) ? remotePayload : (Array.isArray(remotePayload?.feedbacks) ? remotePayload.feedbacks : []);
  const existingData = readData();
  const existingSignatures = new Set(existingData.map(createFeedbackSignature));
  const existingIds = new Set(existingData.map(item => item.id));
  const imported = [], skipped = [];
  for (const item of remoteItems) {
    const normalized = normalizeRemoteFeedback(item, `FB-REMOTE-${uuidv4().slice(0, 8)}`);
    const sig = createFeedbackSignature(normalized);
    if (!normalized.location || !normalized.date || !normalized.passengerName) { skipped.push({ id: normalized.id, reason: 'missing_fields' }); continue; }
    if (existingSignatures.has(sig)) { skipped.push({ id: normalized.id, reason: 'duplicate' }); continue; }
    if (existingIds.has(normalized.id)) normalized.id = `FB-REMOTE-${uuidv4().slice(0, 8)}`;
    existingData.push(normalized);
    existingSignatures.add(sig);
    existingIds.add(normalized.id);
    imported.push(normalized.id);
  }
  writeData(existingData);
  return { success: true, totalRemoteRecords: remoteItems.length, importedCount: imported.length, skippedCount: skipped.length, importedIds: imported };
};

app.post('/api/feedback/import-remote', authenticateToken, async (req, res) => {
  try {
    const sourceUrl = req.body?.sourceUrl || process.env.REMOTE_FEEDBACK_URL;
    if (!sourceUrl) return res.status(400).json({ error: 'Remote URL required.' });
    const result = await importFeedbackFromRemote(sourceUrl);
    res.json({ success: true, message: 'Remote feedback import completed', sourceUrl, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import remote feedback.' });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚉 Aisrailindia Backend running on http://localhost:${PORT}`);
  console.log(`📧 Admin email: ${ADMIN_EMAIL}`);
  console.log(`📬 SMTP configured: ${!!(process.env.SMTP_USER && process.env.SMTP_USER !== 'your-gmail@gmail.com')}`);
  ensureDataFile();

  const autoSyncUrl = process.env.REMOTE_FEEDBACK_URL || 'https://railway-feedback-backend.onrender.com/api/feedback';
  const intervalMinutes = Number(process.env.REMOTE_SYNC_MINUTES || '1');
  if (intervalMinutes > 0) {
    console.log(`🔄 Auto-sync enabled every ${intervalMinutes} min from: ${autoSyncUrl}`);
    const runSync = async () => {
      try {
        const result = await importFeedbackFromRemote(autoSyncUrl);
        console.log(`[SYNC] Imported=${result.importedCount} Skipped=${result.skippedCount}`);
      } catch (err) { console.error('[SYNC] Failed:', err.message); }
    };
    runSync();
    setInterval(runSync, intervalMinutes * 60 * 1000);
  }
});
