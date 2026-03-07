# TODO - Station-based Login Redirect

## Plan
- [x] Understand the codebase and create plan
- [ ] Add Yadgir user to server/data/users.json
- [ ] Update server/index.js to include station in login response
- [ ] Update src/AuthContext.js to store station from login
- [ ] Update src/App.js to redirect to correct station page after login

## Implementation Steps:
1. Add Yadgir user credentials (yadgir@45 / Yadgir56@) to users.json
2. Update login endpoint in server to return station info for each user
3. Modify AuthContext to store station info in localStorage
4. Modify App.js LoginHandler to redirect based on user's station
