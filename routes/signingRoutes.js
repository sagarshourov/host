const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get signing documents for a transaction
router.get('/:transactionId/signing-documents', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const result = await db.query(
      `SELECT * FROM signing_documents 
       WHERE transaction_id = $1 
       ORDER BY document_order ASC`,
      [transactionId]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sign a document
router.post('/:documentId/sign', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { signature, signedAt } = req.body;
    
    const result = await db.query(
      `UPDATE signing_documents 
       SET signed = true, signature_data = $1, signed_at = $2 
       WHERE id = $3 
       RETURNING *`,
      [{"signed_by": "Sagar", "signature": signature}, signedAt, documentId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm funds
router.post('/:transactionId/confirm-funds', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { method, checkNumber, confirmedAt } = req.body;
    
    await db.query(
      `UPDATE transactions 
       SET funds_confirmed = true, fund_method = $1, check_number = $2, funds_confirmed_at = $3 
       WHERE id = $4`,
      [method, checkNumber, confirmedAt, transactionId]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete signing process
router.post('/:transactionId/complete-signing', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Update transaction status
    await db.query(
      `UPDATE transactions 
       SET status = 'signing_completed'
       WHERE id = $1`,
      [transactionId]
    );
    
    // Notify parties (simplified)
    await db.query(
      `INSERT INTO notifications (transaction_id, type, message, created_at) 
       VALUES ($1, 'signing_completed', 'Document signing completed for transaction', NOW())`,
      [transactionId]
    );
    
    res.json({ success: true, status: 'signing_completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;