// routes/movingPreparations.js
const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Adjust path to your database connection

// Get moving preparations for a transaction
router.get('/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const movingPrep = await db.query(
            `SELECT mp.*, 
                    json_agg(DISTINCT ut) as utilities,
                    json_agg(DISTINCT mc) as checklist
             FROM moving_preparations mp
             LEFT JOIN utility_transfers ut ON ut.moving_prep_id = mp.id
             LEFT JOIN moving_checklist mc ON mc.transaction_id = mp.transaction_id
             WHERE mp.transaction_id = $1
             GROUP BY mp.id`,
            [transactionId]
        );

        // If no record exists, return empty object
        const result = movingPrep.rows[0] || {
            possession_date: null,
            mover_scheduled: false,
            mover_date: null,
            mover_company: null,
            address_change_date: null,
            usps_tracking_id: null,
            utilities: [],
            checklist: []
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching moving prep:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update possession date
router.put('/possession-date/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { possession_date } = req.body;

        const result = await db.query(
            `INSERT INTO moving_preparations (transaction_id, buyer_id, possession_date)
             VALUES ($1, $2, $3)
             ON CONFLICT (transaction_id) 
             DO UPDATE SET possession_date = $3, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [transactionId, 1, possession_date] // Replace 1 with actual user ID from auth
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating possession date:', error);
        res.status(500).json({ error: error.message });
    }
});

// Schedule movers
router.put('/movers/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { mover_date, mover_company } = req.body;

        const result = await db.query(
            `INSERT INTO moving_preparations (transaction_id, buyer_id, mover_scheduled, mover_date, mover_company)
             VALUES ($1, $2, true, $3, $4)
             ON CONFLICT (transaction_id) 
             DO UPDATE SET mover_scheduled = true, mover_date = $3, mover_company = $4, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [transactionId, 1, mover_date, mover_company] // Replace 1 with actual user ID from auth
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error scheduling movers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Schedule utility transfer
router.post('/utilities/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { utility_type, company_name, scheduled_date, contact_number } = req.body;

        // First get or create moving preparation record
        const movingPrep = await db.query(
            `INSERT INTO moving_preparations (transaction_id, buyer_id)
             VALUES ($1, $2)
             ON CONFLICT (transaction_id) 
             DO UPDATE SET updated_at = CURRENT_TIMESTAMP
             RETURNING id`,
            [transactionId, 1] // Replace 1 with actual user ID from auth
        );

        const movingPrepId = movingPrep.rows[0]?.id;

        if (!movingPrepId) {
            return res.status(500).json({ error: 'Failed to create moving preparation record' });
        }

        const utility = await db.query(
            `INSERT INTO utility_transfers (moving_prep_id, utility_type, company_name, scheduled_date, contact_number, status)
             VALUES ($1, $2, $3, $4, $5, 'scheduled')
             RETURNING *`,
            [movingPrepId, utility_type, company_name, scheduled_date, contact_number]
        );

        res.json(utility.rows[0]);
    } catch (error) {
        console.error('Error scheduling utility:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update address change
router.put('/address-change/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { address_change_date, usps_tracking_id } = req.body;

        const result = await db.query(
            `INSERT INTO moving_preparations (transaction_id, buyer_id, address_change_date, usps_tracking_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (transaction_id) 
             DO UPDATE SET address_change_date = $3, usps_tracking_id = $4, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [transactionId, 1, address_change_date, usps_tracking_id] // Replace 1 with actual user ID from auth
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating address change:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get utility companies list
router.get('/utility-companies/:state', async (req, res) => {
    try {
        const { state } = req.params;
        
        const companies = await db.query(
            `SELECT * FROM utility_companies WHERE state = $1 OR state IS NULL`,
            [state]
        );

        res.json(companies.rows);
    } catch (error) {
        console.error('Error fetching utility companies:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;