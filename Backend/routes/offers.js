// backend/routes/offers.js
// Offer management routes for submitting, accepting, rejecting offers

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// POST /api/offers - Submit an offer
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            propertyId,
            offerAmount,
            earnestMoney,
            financingType,
            inspectionDays,
            financingDays,
            closingDays,
            buyerMessage,
            inspectionContingency,
            financingContingency,
            appraisalContingency
        } = req.body;

        // Validate required fields
        if (!propertyId || !offerAmount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Property ID and offer amount are required' 
            });
        }

        // Get property details to validate offer
        const propertyResult = await pool.query(
            'SELECT list_price, minimum_offer, seller_id, allow_messages FROM properties WHERE id = $1 AND status = $2',
            [propertyId, 'active']
        );

        if (propertyResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Property not found or not available' 
            });
        }

        const property = propertyResult.rows[0];

        // Check if buyer is trying to buy their own property
        if (property.seller_id === req.user.userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot submit offer on your own property' 
            });
        }

        // Validate minimum offer (50% rule)
        const minimumOffer = property.minimum_offer || property.list_price * 0.5;
        if (offerAmount < minimumOffer) {
            return res.status(400).json({ 
                success: false, 
                error: `Offer must be at least $${minimumOffer.toLocaleString()}` 
            });
        }

        // Create the offer
        const result = await pool.query(`
            INSERT INTO offers (
                property_id, buyer_id, offer_amount, earnest_money,
                financing_type, inspection_days, financing_days, closing_days,
                buyer_message, inspection_contingency, financing_contingency, appraisal_contingency
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) RETURNING *
        `, [
            propertyId, req.user.userId, offerAmount, earnestMoney,
            financingType, inspectionDays || 10, financingDays || 30, closingDays || 45,
            buyerMessage, inspectionContingency !== false, financingContingency !== false, appraisalContingency !== false
        ]);

        const offer = result.rows[0];

        // Create message if provided and allowed
        if (buyerMessage && property.allow_messages) {
            await pool.query(`
                INSERT INTO messages (sender_id, recipient_id, property_id, offer_id, message_text)
                VALUES ($1, $2, $3, $4, $5)
            `, [req.user.userId, property.seller_id, propertyId, offer.id, buyerMessage]);
        }

        res.json({
            success: true,
            message: 'Offer submitted successfully',
            offer: offer
        });

    } catch (error) {
        console.error('Submit offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/offers/property/:propertyId - Get all offers for a property (for sellers)
router.get('/property/:propertyId', authenticateToken, async (req, res) => {
    try {
        const { propertyId } = req.params;

        // Verify user owns this property
        const propertyResult = await pool.query(
            'SELECT seller_id FROM properties WHERE id = $1',
            [propertyId]
        );

        if (propertyResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        if (propertyResult.rows[0].seller_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to view offers for this property' });
        }

        const result = await pool.query(`
            SELECT o.*, u.first_name, u.last_name, u.email, u.phone, u.pre_approval_amount, u.lender_name
            FROM offers o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.property_id = $1
            ORDER BY o.submitted_at DESC
        `, [propertyId]);

        // Calculate offer strength for each offer
        const propertyPriceResult = await pool.query('SELECT list_price FROM properties WHERE id = $1', [propertyId]);
        const listPrice = propertyPriceResult.rows[0]?.list_price || 0;

        const offersWithStrength = result.rows.map(offer => {
            let strength = 'weak';
            const offerPercentage = (offer.offer_amount / listPrice) * 100;
            
            if (offerPercentage >= 95) strength = 'strong';
            else if (offerPercentage >= 85) strength = 'fair';
            
            return {
                ...offer,
                strength,
                offerPercentage: offerPercentage.toFixed(1),
                buyer: {
                    firstName: offer.first_name,
                    lastName: offer.last_name,
                    email: offer.email,
                    phone: offer.phone,
                    preApprovalAmount: offer.pre_approval_amount,
                    preApprovalLender: offer.lender_name
                }
            };
        });

        res.json({
            success: true,
            offers: offersWithStrength
        });

    } catch (error) {
        console.error('Get property offers error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/offers/buyer/my-offers - Get buyer's offers
router.get('/buyer/my-offers', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.*, p.street_address, p.city, p.state, p.list_price,
                   (SELECT file_url FROM property_photos WHERE property_id = p.id AND is_main_photo = TRUE LIMIT 1) as main_photo
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            WHERE o.buyer_id = $1
            ORDER BY o.submitted_at DESC
        `, [req.user.userId]);

        res.json({
            success: true,
            offers: result.rows
        });

    } catch (error) {
        console.error('Get buyer offers error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/offers/:offerId/respond - Respond to an offer (accept, reject, counter)
router.post('/:offerId/respond', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;
        const { action, counterAmount, sellerResponse } = req.body;

        if (!['accept', 'reject', 'counter'].includes(action)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid action. Must be accept, reject, or counter' 
            });
        }

        // Get offer details
        const offerResult = await pool.query(`
            SELECT o.*, p.seller_id
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            WHERE o.id = $1
        `, [offerId]);

        if (offerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Offer not found' });
        }

        const offer = offerResult.rows[0];

        // Check if user is authorized to respond to this offer
        if (offer.seller_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to respond to this offer' });
        }

        let updateQuery;
        let updateParams;

        if (action === 'accept') {
            updateQuery = `
                UPDATE offers 
                SET status = 'accepted', seller_response = $1, responded_at = NOW(), accepted_at = NOW()
                WHERE id = $2
                RETURNING *
            `;
            updateParams = [sellerResponse, offerId];

            // Mark all other pending offers as rejected
            await pool.query(`
                UPDATE offers 
                SET status = 'rejected', seller_response = 'Property sold to another buyer'
                WHERE property_id = $1 AND id != $2 AND status = 'pending'
            `, [offer.property_id, offerId]);

        } else if (action === 'reject') {
            updateQuery = `
                UPDATE offers 
                SET status = 'rejected', seller_response = $1, responded_at = NOW()
                WHERE id = $2
                RETURNING *
            `;
            updateParams = [sellerResponse, offerId];

        } else { // counter
            if (!counterAmount || counterAmount <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Counter amount is required for counter offers' 
                });
            }

            updateQuery = `
                UPDATE offers 
                SET status = 'countered', counter_amount = $1, seller_response = $2, responded_at = NOW()
                WHERE id = $3
                RETURNING *
            `;
            updateParams = [counterAmount, sellerResponse, offerId];
        }

        const result = await pool.query(updateQuery, updateParams);
        const updatedOffer = result.rows[0];

        // Create message for seller response
        if (sellerResponse) {
            await pool.query(`
                INSERT INTO messages (sender_id, recipient_id, property_id, offer_id, message_text)
                VALUES ($1, $2, $3, $4, $5)
            `, [req.user.userId, offer.buyer_id, offer.property_id, offerId, sellerResponse]);
        }

        let message;
        if (action === 'accept') {
            message = 'Offer accepted! The buyer will be notified.';
        } else if (action === 'reject') {
            message = 'Offer rejected. The buyer will be notified.';
        } else {
            message = `Counter offer submitted for $${counterAmount.toLocaleString()}. The buyer will be notified.`;
        }

        res.json({
            success: true,
            message,
            offer: updatedOffer
        });

    } catch (error) {
        console.error('Respond to offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/offers/:offerId - Get offer details
router.get('/:offerId', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;

        const result = await pool.query(`
            SELECT o.*, p.street_address, p.city, p.state, p.list_price, p.seller_id,
                   u.first_name, u.last_name, u.email, u.phone, u.pre_approval_amount
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            JOIN users u ON o.buyer_id = u.id
            WHERE o.id = $1
        `, [offerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Offer not found' });
        }

        const offer = result.rows[0];

        // Check if user is authorized to view this offer
        if (offer.buyer_id !== req.user.userId && offer.seller_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to view this offer' });
        }

        res.json({
            success: true,
            offer: {
                ...offer,
                buyer: {
                    firstName: offer.first_name,
                    lastName: offer.last_name,
                    email: offer.email,
                    phone: offer.phone,
                    preApprovalAmount: offer.pre_approval_amount
                }
            }
        });

    } catch (error) {
        console.error('Get offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/offers/:offerId - Withdraw an offer (for buyers)
router.delete('/:offerId', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;

        // Get offer details
        const offerResult = await pool.query(
            'SELECT buyer_id, status FROM offers WHERE id = $1',
            [offerId]
        );

        if (offerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Offer not found' });
        }

        const offer = offerResult.rows[0];

        // Check if user is authorized to withdraw this offer
        if (offer.buyer_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to withdraw this offer' });
        }

        // Check if offer can be withdrawn
        if (offer.status !== 'pending' && offer.status !== 'countered') {
            return res.status(400).json({ success: false, error: 'Cannot withdraw an offer that has been accepted or rejected' });
        }

        // Mark offer as withdrawn
        await pool.query(
            'UPDATE offers SET status = $1, responded_at = NOW() WHERE id = $2',
            ['withdrawn', offerId]
        );

        res.json({
            success: true,
            message: 'Offer withdrawn successfully'
        });

    } catch (error) {
        console.error('Withdraw offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;