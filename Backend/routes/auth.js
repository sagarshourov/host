// backend/routes/auth.js
// Authentication routes for user registration, login, logout

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ADD THIS TEST ROUTE
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are loaded!' });
});

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

console.log('📊 Database config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ? '[SET]' : '[EMPTY]'
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully at:', res.rows[0].now);
    }
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this';

// Helper function to generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register - User Registration
router.post('/register', async (req, res) => {
    console.log('🔵 Registration endpoint hit');  // ADD THIS
    console.log('📦 Request body:', req.body);     // ADD THIS

    try {
        const { email, password, firstName, lastName, phone, userType = 'buyer' } = req.body;
        console.log('📧 Processing registration for:', email);

        // Validation
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, first name, and last name are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'An account with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user - CHANGED is_verified to email_verified
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, email_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email, first_name, last_name, phone, user_type, email_verified, created_at`,
            [email.toLowerCase(), passwordHash, firstName, lastName, phone, userType, true]
        );

        const user = result.rows[0];

        // Generate JWT token with timestamp to ensure uniqueness
        const token = jwt.sign(
            {
                userId: user.id,
                timestamp: Date.now() // Add timestamp to make token unique
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Store session in database
        await pool.query(
            'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
        );

        // Set HTTP-only cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: false,  // Force false for localhost
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'  // Add this to ensure cookie works on all paths
        });

        res.json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                userType: user.user_type,
                isVerified: user.email_verified  // Map to frontend expectation
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed. Please try again.'
        });
    }
});

// POST /api/auth/login - User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user - CHANGED is_verified to email_verified
        const result = await pool.query(
            'SELECT id, email, password_hash, first_name, last_name, phone, user_type, email_verified FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token with timestamp to ensure uniqueness
        const token = jwt.sign(
            {
                userId: user.id,
                timestamp: Date.now() // Add timestamp to make token unique
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Delete any existing sessions for this user first
        await pool.query(
            'DELETE FROM user_sessions WHERE user_id = $1',
            [user.id]
        );

        // Store new session in database
        await pool.query(
            'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
        );

        // Set HTTP-only cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: false,  // Force false for localhost
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'  // Add this to ensure cookie works on all paths
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                userType: user.user_type,
                isVerified: user.email_verified,// Map to frontend expectation,
                token: token  // Include token in response body
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// POST /api/auth/logout - User Logout
router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies.authToken;

        if (token) {
            // Remove session from database
            await pool.query(
                'DELETE FROM user_sessions WHERE session_token = $1',
                [token]
            );
        }

        // Clear cookie
        res.clearCookie('authToken');

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// GET /api/auth/verify - Verify if user is logged in
router.get('/verify', async (req, res) => {
    try {
        const token = req.cookies.authToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if session exists in database
        const sessionResult = await pool.query(
            'SELECT user_id FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
            [token]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Session expired'
            });
        }

        // Get user info - CHANGED is_verified to email_verified
        const userResult = await pool.query(
            'SELECT id, email, first_name, last_name, phone, user_type, email_verified FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                userType: user.user_type,
                isVerified: user.email_verified  // Map to frontend expectation
            }
        });

    } catch (error) {
        console.error('Auth verification error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid session'
        });
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, phone, userType } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET first_name = $1, last_name = $2, phone = $3, user_type = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING id, email, first_name, last_name, phone, user_type, email_verified`,
            [firstName, lastName, phone, userType, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                userType: user.user_type,
                isVerified: user.email_verified  // Map to frontend expectation
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            error: 'Profile update failed'
        });
    }
});

// PUT /api/auth/pre-approval - Update pre-approval information
router.put('/pre-approval', authenticateToken, async (req, res) => {
    try {
        const { preApprovalAmount, preApprovalLender, preApprovalExpiry } = req.body;

        // Note: Your database has pre_approval_expires not pre_approval_expiry
        // Also missing lender_name column - using pre_approval_amount only
        const result = await pool.query(
            `UPDATE users 
             SET pre_approval_amount = $1, pre_approval_expires = $2, is_pre_approved = TRUE, updated_at = NOW()
             WHERE id = $3
             RETURNING pre_approval_amount, pre_approval_expires, is_pre_approved`,
            [preApprovalAmount, preApprovalExpiry, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Pre-approval information updated',
            preApproval: result.rows[0]
        });

    } catch (error) {
        console.error('Pre-approval update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;