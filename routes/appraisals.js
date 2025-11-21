// appraisalRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Get appraisal for transaction
router.get('/transaction/:transactionId', authenticateToken, async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const result = await pool.query(`
            SELECT a.*, 
                   p.street_address, p.city, p.state, p.zip_code,
                   u.first_name as appraiser_name, u.email as appraiser_email
            FROM appraisals a
            JOIN properties p ON a.property_id = p.id
            LEFT JOIN users u ON a.appraiser_id = u.id
            WHERE a.transaction_id = $1
        `, [transactionId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Appraisal not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching appraisal:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Order appraisal
router.post('/order', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { transactionId, propertyId, purchasePrice, appraisalCost } = req.body;
        
        // Insert appraisal
        const appraisalResult = await client.query(`
            INSERT INTO appraisals (
                transaction_id, property_id, purchase_price, appraisal_cost, status
            ) VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *
        `, [transactionId, propertyId, purchasePrice, appraisalCost || 500]);
        
        const appraisal = appraisalResult.rows[0];
        
        // Log event
        await client.query(`
            INSERT INTO appraisal_events (appraisal_id, event_type, event_description, created_by)
            VALUES ($1, 'ordered', 'Appraisal ordered by lender', $2)
        `, [appraisal.id, req.user.id]);
        
        // Update transaction status
        await client.query(`
            UPDATE transactions 
            SET current_phase = 'appraisal', 
                current_step = 42,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [transactionId]);
        
        await client.query('COMMIT');
        res.status(201).json(appraisal);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error ordering appraisal:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Schedule appraisal
router.patch('/:id/schedule', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { scheduledDate, appraiserId } = req.body;
        
        const result = await client.query(`
            UPDATE appraisals 
            SET scheduled_date = $1, 
                appraiser_id = $2,
                status = 'scheduled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [scheduledDate, appraiserId, id]);
        
        // Log event
        await client.query(`
            INSERT INTO appraisal_events (appraisal_id, event_type, event_description, created_by)
            VALUES ($1, 'scheduled', $2, $3)
        `, [id, `Appraisal scheduled for ${scheduledDate}`, req.user.id]);
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error scheduling appraisal:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Submit appraisal report
router.patch('/:id/complete', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { appraisedValue, reportUrl, appraiserNotes } = req.body;
        
        // Get current appraisal
        const currentResult = await client.query(
            'SELECT purchase_price FROM appraisals WHERE id = $1',
            [id]
        );
        
        const purchasePrice = parseFloat(currentResult.rows[0].purchase_price);
        const appraisalDifference = purchasePrice - parseFloat(appraisedValue);
        const status = appraisalDifference > 0 ? 'low_appraisal' : 'approved';
        
        const result = await client.query(`
            UPDATE appraisals 
            SET appraised_value = $1,
                appraisal_report_url = $2,
                appraiser_notes = $3,
                completed_date = CURRENT_TIMESTAMP,
                appraisal_difference = $4,
                status = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [appraisedValue, reportUrl, appraiserNotes, appraisalDifference, status, id]);
        
        // Log event
        const eventDesc = status === 'low_appraisal' 
            ? `Appraisal completed - Value $${appraisedValue} is $${appraisalDifference} below purchase price`
            : `Appraisal completed - Value $${appraisedValue} meets or exceeds purchase price`;
            
        await client.query(`
            INSERT INTO appraisal_events (appraisal_id, event_type, event_description, created_by)
            VALUES ($1, 'completed', $2, $3)
        `, [id, eventDesc, req.user.id]);
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error completing appraisal:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Resolve low appraisal
router.patch('/:id/resolve', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { resolutionType, newPurchasePrice } = req.body;
        
        let status = 'approved';
        if (resolutionType === 'contract_cancelled') {
            status = 'cancelled';
        }
        
        const result = await client.query(`
            UPDATE appraisals 
            SET resolution_type = $1,
                new_purchase_price = $2,
                status = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [resolutionType, newPurchasePrice, status, id]);
        
        const appraisal = result.rows[0];
        
        // If price reduced, update contract
        if (resolutionType === 'price_reduced' && newPurchasePrice) {
            await client.query(`
                UPDATE transactions 
                SET sale_price = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [newPurchasePrice, appraisal.transaction_id]);
        }
        
        // Log event
        const resolutionMessages = {
            'proceed_as_is': 'Proceeding with original purchase price',
            'price_reduced': `Purchase price reduced to $${newPurchasePrice}`,
            'buyer_pays_difference': 'Buyer will pay the difference in cash',
            'contract_cancelled': 'Contract cancelled due to low appraisal'
        };
        
        await client.query(`
            INSERT INTO appraisal_events (appraisal_id, event_type, event_description, created_by)
            VALUES ($1, 'resolved', $2, $3)
        `, [id, resolutionMessages[resolutionType], req.user.id]);
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resolving appraisal:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Get recommended appraisers
router.get('/appraisers/recommended', authenticateToken, async (req, res) => {
    try {
        const { zipCode } = req.query;
        
        const result = await pool.query(`
            SELECT * FROM recommended_appraisers
            WHERE is_active = true
            AND (service_areas IS NULL OR service_areas @> $1::jsonb)
            ORDER BY rating DESC, total_appraisals DESC
            LIMIT 10
        `, [JSON.stringify([zipCode])]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching appraisers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get appraisal timeline
router.get('/:id/timeline', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT ae.*, u.first_name as created_by_name
            FROM appraisal_events ae
            LEFT JOIN users u ON ae.created_by = u.id
            WHERE ae.appraisal_id = $1
            ORDER BY ae.created_at DESC
        `, [id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching timeline:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;