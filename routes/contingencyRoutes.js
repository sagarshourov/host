const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// GET - Fetch contingencies for an offer
router.get('/:offerId', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;
        const userId = req.user.userId; // From auth token

        const result = await pool.query(
            `SELECT * FROM offer_contingencies 
       WHERE transactions_id = $1 AND user_id = $2 
       ORDER BY updated_at DESC 
       LIMIT 1`,
            [offerId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No contingencies found for this offer =' + offerId + '+' + userId
            });
        }

        res.json({
            success: true,
            data: {
                id: result.rows[0].id,
                offerId: result.rows[0].transactions_id,
                userId: result.rows[0].user_id,
                state: result.rows[0].state,
                contingencies: result.rows[0].contingencies,
                deadlines: result.rows[0].deadlines,
                offerStrength: result.rows[0].offer_strength,
                metadata: result.rows[0].metadata,
                createdAt: result.rows[0].created_at,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Error fetching contingencies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contingencies',
            error: error.message
        });
    }
});

// POST - Save or update contingencies
router.post('/', authenticateToken, async (req, res) => {
    try {

        // const { userId } = req.params;
        const userId = req.user.userId;
        const {
            offerId,
            peropertYstate,
            contingencies,
            deadlines,
            offerStrength,
            metadata
        } = req.body;

        // Validate required fields
        if (!offerId || !userId || !peropertYstate || !contingencies) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields' + userId
            });
        }

        // Check if record exists
        const existingRecord = await pool.query(
            'SELECT id FROM offer_contingencies WHERE transactions_id = $1 AND user_id = $2',
            [offerId, userId]
        );

        let result;

        if (existingRecord.rows.length > 0) {
            // Update existing record
            result = await pool.query(
                `UPDATE offer_contingencies 
         SET state = $1, 
             contingencies = $2, 
             deadlines = $3, 
             offer_strength = $4, 
             metadata = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE transactions_id = $6 AND user_id = $7
         RETURNING *`,
                [peropertYstate, contingencies, deadlines, offerStrength, metadata, offerId, userId]
            );
        } else {
            // Insert new record
            result = await pool.query(
                `INSERT INTO offer_contingencies 
         (transactions_id, user_id, state, contingencies, deadlines, offer_strength, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
                [offerId, userId, peropertYstate, contingencies, deadlines, offerStrength, metadata]
            );
        }

        await pool.query(
            `UPDATE task_value 
                       SET status = 'completed' 
                       WHERE task_id = $1 AND transactions_id = $2`,
            [10, offerId]
        ); // done esign
        // Also update the offers table to mark this step as complete

        res.json({
            success: true,
            message: 'Contingencies saved successfully',
            data: {
                id: result.rows[0].id,
                offerId: result.rows[0].transactions_id,
                peropertYstate: result.rows[0].state,
                offerStrength: result.rows[0].offer_strength,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Error saving contingencies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save contingencies',
            error: error.message
        });
    }
});

// DELETE - Remove contingencies (if user wants to start over)
router.delete('/:offerId', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            'DELETE FROM offer_contingencies WHERE transactions_id = $1 AND user_id = $2 RETURNING *',
            [offerId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No contingencies found to delete'
            });
        }

        res.json({
            success: true,
            message: 'Contingencies deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting contingencies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete contingencies',
            error: error.message
        });
    }
});

// GET - Get all contingencies for a user (for history/analytics)
router.get('/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user can only access their own data
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const result = await pool.query(
            `SELECT oc.*, o.property_address, o.offer_price 
       FROM offer_contingencies oc
       JOIN offers o ON oc.transactions_id = o.id
       WHERE oc.user_id = $1
       ORDER BY oc.updated_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching user contingencies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contingencies',
            error: error.message
        });
    }
});

module.exports = router;