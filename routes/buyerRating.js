// routes/buyerRating.js
const express = require('express');
const router = express.Router();
const BuyerRatingService = require('../services/BuyerRatingService');

const { authenticateToken } = require('../middleware/auth');

// Get current buyer rating
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const rating = await BuyerRatingService.calculateBuyerRating(userId);
        res.json(rating);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Recalculate rating (for when financial data changes)
router.post('/recalculate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const rating = await BuyerRatingService.forceRecalculate(userId);
        res.json(rating);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;