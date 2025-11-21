// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const db = require('../config/database');

// @desc   Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      // Get user from database excluding password
      const userResult = await db.query(
        `SELECT id, email, first_name, last_name, user_type, phone, avatar_url, 
                is_verified, created_at, updated_at
         FROM users 
         WHERE id = $1`,
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        res.status(401);
        throw new Error('User not found');
      }

      // Attach user to request object
      req.user = userResult.rows[0];
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// @desc   Optional auth - verify token if present but don't require it
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      const userResult = await db.query(
        `SELECT id, email, first_name, last_name, user_type, phone, avatar_url, 
                is_verified, created_at, updated_at
         FROM users 
         WHERE id = $1`,
        [decoded.id]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }
    } catch (error) {
      // If token is invalid, just continue without user
      console.log('Optional auth - invalid token:', error.message);
    }
  }

  next();
});

// @desc   Authorize by user type (admin, agent, buyer, seller)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, no user');
    }

    if (!roles.includes(req.user.user_type)) {
      res.status(403);
      throw new Error(`User role ${req.user.user_type} is not authorized to access this route`);
    }
    next();
  };
};

// @desc   Check if user owns the resource or is admin/agent
const authorizeResource = (resourceTable, resourceIdParam = 'id') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    // Admin and agents can access any resource
    if (['admin', 'agent'].includes(req.user.user_type)) {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    
    // Determine ownership column based on user type
    let ownershipColumn;
    switch (req.user.user_type) {
      case 'buyer':
        ownershipColumn = 'buyer_id';
        break;
      case 'seller':
        ownershipColumn = 'seller_id';
        break;
      default:
        ownershipColumn = 'user_id';
    }

    // Check if user owns the resource
    const ownershipCheck = await db.query(
      `SELECT id FROM ${resourceTable} WHERE id = $1 AND ${ownershipColumn} = $2`,
      [resourceId, req.user.id]
    );

    if (ownershipCheck.rows.length === 0) {
      res.status(403);
      throw new Error('Not authorized to access this resource');
    }

    next();
  });
};

// @desc   Check if user is part of the transaction (buyer, seller, or agent)
const authorizeTransaction = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const transactionId = req.params.transactionId || req.body.transactionId;

  if (!transactionId) {
    res.status(400);
    throw new Error('Transaction ID is required');
  }

  // Check if user is associated with the transaction
  const transactionCheck = await db.query(
    `SELECT id FROM transactions 
     WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR agent_id = $2)`,
    [transactionId, req.user.id]
  );

  if (transactionCheck.rows.length === 0) {
    res.status(403);
    throw new Error('Not authorized to access this transaction');
  }

  next();
});

module.exports = {
  protect,
  optionalAuth,
  authorize,
  authorizeResource,
  authorizeTransaction
};