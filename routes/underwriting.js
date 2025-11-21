// routes/underwriting.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get underwriting status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM underwriting_status 
       WHERE transaction_id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Underwriting status not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit documents
router.post('/documents', async (req, res) => {
  try {
    const { transactionId, documents } = req.body;

    // Insert documents
    for (const doc of documents) {
      await pool.query(
        `INSERT INTO underwriting_documents 
         (transaction_id, document_type, document_name, file_path, uploaded_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [transactionId, doc.type, doc.name, doc.filePath, new Date()]
      );
    }

    // Update pending documents
    await pool.query(
      `UPDATE underwriting_status 
       SET pending_documents = pending_documents - $1,
           last_updated = $2
       WHERE transaction_id = $3`,
      [documents.length, new Date(), transactionId]
    );

    res.json({ message: 'Documents submitted successfully', documents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check clear to close status
router.get('/clear-to-close/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const statusResult = await pool.query(
      `SELECT * FROM underwriting_status 
       WHERE transaction_id = $1`,
      [transactionId]
    );

    if (statusResult.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const status = statusResult.rows[0];
    const conditionsResult = await pool.query(
      `SELECT COUNT(*) as pending_count FROM underwriting_conditions 
       WHERE transaction_id = $1 AND status = 'pending'`,
      [transactionId]
    );

    const hasPendingConditions = parseInt(conditionsResult.rows[0].pending_count) > 0;
    const hasPendingDocuments = status.pending_documents > 0;

    let clearToClose = false;
    let loanApproved = false;

    if (!hasPendingConditions && !hasPendingDocuments) {
      if (status.status === 'conditions_requested') {
        // Update to clear to close
        await pool.query(
          `UPDATE underwriting_status 
           SET status = 'clear_to_close', clear_to_close_date = $1 
           WHERE transaction_id = $2`,
          [new Date(), transactionId]
        );
        clearToClose = true;
      } else if (status.status === 'clear_to_close') {
        // Final approval
        await pool.query(
          `UPDATE underwriting_status 
           SET status = 'approved', loan_approval_date = $1 
           WHERE transaction_id = $2`,
          [new Date(), transactionId]
        );
        loanApproved = true;
      }
    }

    res.json({
      clearToClose,
      loanApproved,
      clearToCloseDate: status.clear_to_close_date,
      approvalDate: status.loan_approval_date,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add underwriting condition
router.post('/conditions', async (req, res) => {
  try {
    const { transactionId, title, description, documentType } = req.body;

    const result = await pool.query(
      `INSERT INTO underwriting_conditions 
       (transaction_id, title, description, required_document_type, status) 
       VALUES ($1, $2, $3, $4, 'pending') 
       RETURNING *`,
      [transactionId, title, description, documentType]
    );

    // Update pending documents count
    await pool.query(
      `UPDATE underwriting_status 
       SET pending_documents = pending_documents + 1,
           status = 'conditions_requested',
           last_updated = $1
       WHERE transaction_id = $2`,
      [new Date(), transactionId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;