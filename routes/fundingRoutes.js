// routes/funding.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get funding status
router.get('/:id/funding', async (req, res) => {
  try {
    const { id } = req.params;

    const transactionQuery = `
      SELECT t.*, 
             json_agg(d) as disbursements,
             json_agg(rl) as recording_logs
      FROM transactions t
      LEFT JOIN disbursements d ON t.id = d.transaction_id
      LEFT JOIN recording_logs rl ON t.id = rl.transaction_id
      WHERE t.id = $1
      GROUP BY t.id
    `;

    const result = await db.query(transactionQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update funding status
router.put('/:id/funding', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, keys_delivered, documents_delivered } = req.body;

    const updateQuery = `
      UPDATE transactions 
      SET status = COALESCE($1, status),
          keys_delivered = COALESCE($2, keys_delivered),
          documents_delivered = COALESCE($3, documents_delivered),
          completed_at = CASE 
            WHEN $1 = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
            ELSE completed_at
          END
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      status,
      keys_delivered,
      documents_delivered,
      id
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initiate recording
router.post('/:id/recording', async (req, res) => {
  try {
    const { id } = req.params;
    const { county_reference } = req.body;

    // Update transaction recording status
    const updateTransactionQuery = `
      UPDATE transactions 
      SET recording_status = 'in_progress'
      WHERE id = $1
      RETURNING *
    `;

    // Create recording log
    const insertLogQuery = `
      INSERT INTO recording_logs (transaction_id, action, status, county_reference)
      VALUES ($1, 'deed_recording', 'submitted', $2)
      RETURNING *
    `;

    await db.query('BEGIN');

    const transactionResult = await db.query(updateTransactionQuery, [id]);
    const logResult = await db.query(insertLogQuery, [id, county_reference]);

    await db.query('COMMIT');

    res.json({
      transaction: transactionResult.rows[0],
      recording_log: logResult.rows[0]
    });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Complete recording
router.put('/:id/recording', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, recorded_at } = req.body;

    // More readable approach
    let updateQuery;
    let params;

    if (status === 'completed') {
      updateQuery = `
    UPDATE transactions 
    SET recording_status = $1,
        recording_completed_at = COALESCE($2, CURRENT_TIMESTAMP),
        deed_recorded_at = COALESCE($2, CURRENT_TIMESTAMP)
    WHERE id = $3
    RETURNING *
  `;
      params = [status, recorded_at, id];
    } else {
      updateQuery = `
    UPDATE transactions 
    SET recording_status = $1
    WHERE id = $2
    RETURNING *
  `;
      params = [status, id];
    }

    const result = await db.query(updateQuery, params);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add disbursement
router.post('/:id/disbursements', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, recipient_type, recipient_name } = req.body;

    const query = `
      INSERT INTO disbursements (transaction_id, amount, recipient_type, recipient_name, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;

    const result = await db.query(query, [id, amount, recipient_type, recipient_name]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;