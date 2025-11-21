// routes/walkThrough.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get walk-through for transaction
router.get('/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const walkThroughQuery = `
            SELECT * FROM walk_throughs 
            WHERE transaction_id = $1
        `;
        const walkThroughResult = await db.query(walkThroughQuery, [transactionId]);
        
        if (walkThroughResult.rows.length === 0) {
            return res.json({ exists: false });
        }
        
        const walkThrough = walkThroughResult.rows[0];
        
        // Get checklist items
        const checklistQuery = `
            SELECT * FROM walk_through_checklist 
            WHERE walk_through_id = $1
        `;
        const checklistResult = await db.query(checklistQuery, [walkThrough.id]);
        
        // Get issues
        const issuesQuery = `
            SELECT * FROM walk_through_issues 
            WHERE walk_through_id = $1
        `;
        const issuesResult = await db.query(issuesQuery, [walkThrough.id]);
        
        res.json({
            exists: true,
            walkThrough: {
                ...walkThrough,
                checklist: checklistResult.rows,
                issues: issuesResult.rows
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Schedule walk-through
router.post('/schedule', async (req, res) => {
    try {
        const { transaction_id, scheduled_date } = req.body;
        
        const query = `
            INSERT INTO walk_throughs (transaction_id, scheduled_date, status)
            VALUES ($1, $2, 'scheduled')
            RETURNING *
        `;
        const result = await db.query(query, [transaction_id, scheduled_date]);
        
        // Create default checklist items
        const defaultChecklist = [
            { category: 'Repairs', item_name: 'Verify all agreed repairs completed' },
            { category: 'Property Condition', item_name: 'Confirm no new damage since inspection' },
            { category: 'Vacancy', item_name: 'Ensure property is vacant (if agreed)' },
            { category: 'Systems', item_name: 'Test HVAC system' },
            { category: 'Systems', item_name: 'Test plumbing and water pressure' },
            { category: 'Systems', item_name: 'Test electrical outlets and lights' },
            { category: 'Appliances', item_name: 'Test all included appliances' },
            { category: 'Exterior', item_name: 'Check exterior condition' }
        ];
        
        for (const item of defaultChecklist) {
            await db.query(
                'INSERT INTO walk_through_checklist (walk_through_id, category, item_name) VALUES ($1, $2, $3)',
                [result.rows[0].id, item.category, item.item_name]
            );
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update checklist item
router.put('/checklist/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, photo_url } = req.body;
        
        const query = `
            UPDATE walk_through_checklist 
            SET status = $1, notes = $2, photo_url = $3
            WHERE id = $4
            RETURNING *
        `;
        const result = await db.query(query, [status, notes, photo_url, id]);
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add issue
router.post('/issues', async (req, res) => {
    try {
        const { walk_through_id, description, photo_urls, severity } = req.body;
        
        const query = `
            INSERT INTO walk_through_issues (walk_through_id, description, photo_urls, severity)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(query, [walk_through_id, description, photo_urls, severity]);
        
        // Update walk-through to indicate issues found
        await db.query(
            'UPDATE walk_throughs SET issues_found = true WHERE id = $1',
            [walk_through_id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Complete walk-through
router.put('/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { buyer_notes, agent_notes } = req.body;
        
        const query = `
            UPDATE walk_throughs 
            SET status = 'completed', completed_date = CURRENT_TIMESTAMP, 
                buyer_notes = $1, agent_notes = $2
            WHERE id = $3
            RETURNING *
        `;
        const result = await db.query(query, [buyer_notes, agent_notes, id]);
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;