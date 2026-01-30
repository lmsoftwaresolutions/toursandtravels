# Authentication System - Complete Guide

## Overview

Your Travel Management System now has a comprehensive authentication system with role-based access control.

---

## 🔐 User Accounts

### Admin Users (Full Access)
- **Username**: `Nathkrupa_1` | **Password**: `Nathkrupa_1`
  - Full access to all features
  - Can manage all data
  
- **Username**: `Nathkrupa_2` | **Password**: `Nathkrupa_2`
  - Full access to all features
  - Can manage all data

### Limited Access User
- **Username**: `Nathkrupa_3` | **Password**: `Nathkrupa_3`
  - Restricted access
  - Can view reports (read-only)
  - Cannot modify core data

---

## 🚀 How It Works

### Login Flow
1. User navigates to the application
2. If not authenticated, redirected to `/login`
3. Enter username and password
4. Backend validates credentials
5. JWT token generated and stored locally
6. User redirected to dashboard
7. Token automatically added to all API requests

### Logout Flow
1. Click "Logout" button in top-right navbar
2. Token and user info cleared from local storage
3. Redirected to login page
4. All API requests reset

---

## 🔑 Security Features

### Password Security
- Passwords hashed using bcrypt
- Never stored in plain text
- Strong hashing with salt

### JWT Tokens
- 7-day expiration (can be configured)
- Signed with secret key
- Automatically attached to requests
- Verified on each protected endpoint

### Protected Routes
- All application routes protected
- Unauthorized access redirected to login
- Role-based access control implemented

---

## 📝 Frontend Implementation

### Login Page
- Clean, modern UI
- Shows demo credentials
- Error handling
- Loading states

### Protected Routes
```jsx
<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>
```

### Auth Service
```javascript
// Login
await authService.login(username, password);

// Check authentication
authService.isAuthenticated(); // true/false

// Check role
authService.isAdmin(); // true/false

// Get current user
const user = authService.getUser();

// Logout
authService.logout();
```

### Navbar Integration
- Shows current username
- Displays user role badge
- Logout button

---

## 🔧 Backend Architecture

### Models
- `User` model with username, password_hash, role
- Password hashing/verification methods

### Schemas
- `UserCreate` - for creating users
- `LoginRequest` - username/password
- `LoginResponse` - token + user info
- `UserResponse` - user data

### Services
- `auth_service.py` - handles login logic
- JWT token generation and verification
- Password hashing with bcrypt

### Routes
- `POST /auth/login` - Login endpoint
- Returns JWT token and user info

---

## 🛠️ Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'user'
);
```

---

## 📋 User Roles & Access

### Admin Role
- Full system access
- Can create/edit/delete all records
- Can manage other users (future)
- Access to all reports
- No restrictions

### Limited Role
- Read-only access
- Cannot create new records
- Cannot edit existing records
- Cannot delete records
- View reports only

---

## 🔄 Token Management

### Token Storage
- Stored in browser localStorage as `auth_token`
- Automatically retrieved on app load
- Added to all API requests in header

### Token Expiration
- Expires after 7 days
- Automatic logout on expiration
- User must login again

### Token Format
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🚨 Error Handling

### Login Errors
- Invalid username → "Invalid username or password"
- Invalid password → "Invalid username or password"
- Empty fields → "Username and password are required"

### Authorization Errors
- Not authenticated → Redirected to login
- Insufficient permissions → "Access Denied" message
- Expired token → Automatic logout to login page

---

## 🔐 Best Practices Implemented

✅ Passwords hashed with bcrypt
✅ JWT tokens for stateless auth
✅ Protected routes with redirects
✅ Role-based access control
✅ Token auto-attach to requests
✅ Secure logout
✅ User info in localStorage
✅ Error handling and feedback

---

## 📱 Frontend Components

### Login Page (`/login`)
- Professional UI
- Demo credentials display
- Error messaging
- Loading states

### ProtectedRoute Component
- Checks authentication status
- Validates user roles
- Shows access denied page
- Redirects unauthorized users

### Navbar
- Shows username
- Role badge
- Logout button

---

## 🔧 Configuration

### Secret Key
Location: `backend/app/services/auth_service.py`
```python
SECRET_KEY = "your-secret-key-change-in-production-nathkrupa-travel-2024"
```
⚠️ **IMPORTANT**: Change this in production!

### Token Expiration
Location: `backend/app/services/auth_service.py`
```python
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days
```

---

## 🧪 Testing the System

### Test Admin Login
1. Go to http://localhost:5173
2. Enter: `Nathkrupa_1` / `Nathkrupa_1`
3. Click Login
4. Should see full dashboard access

### Test Limited Login
1. Go to http://localhost:5173
2. Enter: `Nathkrupa_3` / `Nathkrupa_3`
3. Click Login
4. Should see limited dashboard (restrictions enforced)

### Test Logout
1. Click "Logout" in top-right navbar
2. Should be redirected to login page
3. LocalStorage should be cleared

---

## 🔮 Future Enhancements

1. **User Management Page** - Create/edit/delete users (admin only)
2. **Change Password** - Allow users to change their password
3. **Two-Factor Authentication** - Additional security layer
4. **Forgot Password** - Email-based password reset
5. **User Permissions** - Fine-grained permission control
6. **Session Management** - View active sessions
7. **Audit Logs** - Track user actions
8. **OAuth Integration** - Google/GitHub login

---

## 📞 Troubleshooting

### "Invalid username or password"
- Check username spelling (case-sensitive)
- Verify password is correct
- Ensure user exists in database

### "You need admin privileges"
- Currently logged in as limited user
- Login with admin account instead
- `Nathkrupa_1` or `Nathkrupa_2`

### Stuck on login page
- Check if backend is running on port 8000
- Check browser console for errors
- Clear localStorage and try again

### Token errors
- Token may have expired (7 days)
- Logout and login again
- Check SECRET_KEY matches between frontend/backend

---

## 📚 Related Files

```
backend/
  app/
    models/
      user.py ✨ NEW
    schemas/
      user.py ✨ NEW
    services/
      auth_service.py ✨ NEW
    api/routes/
      auth.py ✨ NEW
    main.py (updated)

frontend/
  src/
    pages/
      auth/
        Login.jsx (updated)
    services/
      auth.js ✨ NEW
    components/
      auth/
        ProtectedRoute.jsx ✨ NEW
      layout/
        Navbar.jsx (updated)
    routes/
      AppRoutes.jsx (updated)
    App.jsx (updated)
```

---

*Last Updated: January 29, 2026*
