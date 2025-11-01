// backend/middleware/auth.js
// Authentication middleware

const { query, transaction } = require('../config/database');
const jwt = require('jsonwebtoken');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }


    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const userResult = await query(
            'SELECT id as userId , email, first_name, last_name, phone, user_type, email_verified FROM users WHERE id = $1',
            [decoded.userId]
        );

        //  req.user = userResult.rows[0];

        req.user = {
            ...userResult.rows[0],
            userId: decoded.userId
        };
        next();
    } catch (error) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
};



module.exports = { authenticateToken };