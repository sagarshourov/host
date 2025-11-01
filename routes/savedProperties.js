const express = require('express');
const router = express.Router();
const savedPropertyController = require('../controllers/savedPropertyController');


const { authenticateToken } = require('../middleware/auth');

// Save a property
router.post('/buyer/save', authenticateToken, savedPropertyController.saveProperty);

// Unsave a property
router.delete('/buyer/:propertyId', authenticateToken, savedPropertyController.unsaveProperty);

// Get all saved properties for a user
router.get('/buyer/user', authenticateToken, savedPropertyController.getUserSavedProperties);

// Check if a property is saved by user
router.get('/buyer/check/:propertyId/:userId', authenticateToken, savedPropertyController.checkIfSaved);

module.exports = router;