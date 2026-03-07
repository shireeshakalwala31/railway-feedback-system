# Task: Station-based Login Flow

## Plan

### 1. src/App.js
- [ ] Modify LoginHandler to accept and use the station prop
- [ ] Save station to localStorage before login
- [ ] After successful login, redirect to /feedback/{station} using localStorage

### 2. src/Login.js
- [ ] Accept optional station prop
- [ ] Display station name on login form when provided

### 3. src/FeedbackForm.js
- [ ] Check localStorage for station if not provided via prop or URL param

## Completed
- [x] Analysis and planning
