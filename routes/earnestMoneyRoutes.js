const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const uploadDir = '../uploads/wire-confirmations';







// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF allowed.'));
    }
  }
});

// ==================== TITLE COMPANIES ENDPOINTS ====================

// Get all title companies
router.get('/title-companies', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, email, address, city, state, zip_code FROM title_companies WHERE active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching title companies:', error);
    res.status(500).json({ error: 'Failed to fetch title companies' });
  }
});

// Search title companies by location
router.get('/title-companies/search', async (req, res) => {
  try {
    const { city, state } = req.query;

    if (!city || !state) {
      return res.status(400).json({ error: 'City and state are required' });
    }

    const result = await pool.query(
      `SELECT id, name, phone, email, address, city, state, zip_code 
       FROM title_companies 
       WHERE active = true AND LOWER(city) = LOWER($1) AND LOWER(state) = LOWER($2)
       ORDER BY name`,
      [city, state]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching title companies:', error);
    res.status(500).json({ error: 'Failed to search title companies' });
  }
});

// ==================== WIRE INSTRUCTIONS ENDPOINTS ====================

// Get wire instructions for a transaction
router.get('/wire-instructions/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT wi.*, tc.name as title_company_name, tc.phone as title_company_phone
       FROM wire_instructions wi
       LEFT JOIN title_companies tc ON wi.title_company_id = tc.id
       WHERE wi.transaction_id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wire instructions not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching wire instructions:', error);
    res.status(500).json({ error: 'Failed to fetch wire instructions' });
  }
});

// Create/Update wire instructions
router.post('/wire-instructions', async (req, res) => {
  try {
    const {
      transactionId,
      titleCompanyId,
      bankName,
      accountNumber,
      routingNumber,
      bankAddress,
      bankCity,
      bankState,
      swiftCode,
      instructionsText,
      referenceLineOne,
      referenceLineTwo
    } = req.body;

    // Validate required fields
    if (!transactionId || !titleCompanyId || !bankName || !accountNumber || !routingNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if transaction exists
    const transactionCheck = await pool.query(
      'SELECT id FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Insert or update wire instructions
    const result = await pool.query(
      `INSERT INTO wire_instructions 
       (transaction_id, title_company_id, bank_name, account_number, routing_number, 
        bank_address, bank_city, bank_state, swift_code, instructions_text, 
        reference_line_1, reference_line_2, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       ON CONFLICT (transaction_id) DO UPDATE SET
       title_company_id = $2, bank_name = $3, account_number = $4, routing_number = $5,
       bank_address = $6, bank_city = $7, bank_state = $8, swift_code = $9,
       instructions_text = $10, reference_line_1 = $11, reference_line_2 = $12, updated_at = NOW()
       RETURNING *`,
      [transactionId, titleCompanyId, bankName, accountNumber, routingNumber,
        bankAddress, bankCity, bankState, swiftCode, instructionsText,
        referenceLineOne, referenceLineTwo]
    );

    // Update transaction with title company selection
    await pool.query(
      `UPDATE transactions 
       SET selected_title_company_id = $1, earnest_money_step = 1, updated_at = NOW()
       WHERE id = $2`,
      [titleCompanyId, transactionId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating wire instructions:', error);
    res.status(500).json({ error: 'Failed to create wire instructions' });
  }
});

// ==================== PHONE VERIFICATION ENDPOINTS ====================

// Verify phone with title company
router.post('/verify-phone', async (req, res) => {
  try {
    const { transactionId, titleCompanyId, phoneVerified } = req.body;

    if (!transactionId || !titleCompanyId) {
      return res.status(400).json({ error: 'Transaction ID and title company ID required' });
    }

    // Insert phone verification record
    await pool.query(
      `INSERT INTO phone_verifications (transaction_id, user_id, title_company_id, verified, verified_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (transaction_id) DO UPDATE SET
       verified = $4, verified_at = NOW()`,
      [transactionId, req.user?.id || 1, titleCompanyId, phoneVerified === true]
    );

    // Update transaction
    const result = await pool.query(
      `UPDATE transactions 
       SET phone_verified = $1, phone_verified_at = NOW(), earnest_money_step = 2, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [phoneVerified === true, transactionId]
    );

    res.json({
      success: true,
      message: 'Phone verification recorded',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
});

// ==================== WIRE CONFIRMATION ENDPOINTS ====================

// Upload wire confirmation
router.post('/upload-confirmation/:transactionId', upload.single('confirmation'), async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { wireConfirmationNumber } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    if (!wireConfirmationNumber) {
      return res.status(400).json({ error: 'Wire confirmation number is required' });
    }

    // Check transaction exists
    const transactionCheck = await pool.query(
      'SELECT earnest_money_amount FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Insert wire confirmation
    const result = await pool.query(
      `INSERT INTO wire_confirmations 
       (transaction_id, confirmation_number, file_path, file_name, file_size, file_type, 
        uploaded_by, wire_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
       RETURNING *`,
      [
        transactionId,
        wireConfirmationNumber,
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        req.user?.id || 1,
        transactionCheck.rows[0].earnest_money_amount
      ]
    );

    // Update transaction status
    await pool.query(
      `UPDATE transactions 
       SET earnest_money_status = 'confirmation_received', earnest_money_step = 5, updated_at = NOW()
       WHERE id = $1`,
      [transactionId]
    );

    res.json({
      success: true,
      message: 'Wire confirmation uploaded successfully',
      confirmation: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading confirmation:', error);
    res.status(500).json({ error: 'Failed to upload confirmation' });
  }
});

// ==================== EARNEST MONEY VERIFICATION ====================

// Verify with title company
router.post('/verify-with-title-company/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { earnestMoneyAmount } = req.body;

    if (!transactionId || !earnestMoneyAmount) {
      return res.status(400).json({ error: 'Transaction ID and amount required' });
    }

    // Get transaction
    const transaction = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Simulate title company verification (replace with actual API call)
    const verified = true; // In production, call actual title company API

    // Create earnest money escrow record
    const escrowResult = await pool.query(
      `INSERT INTO earnest_money_escrows 
       (transaction_id, buyer_id, title_company_id, amount, percentage_of_purchase, status, received_date, created_at)
       VALUES ($1, $2, $3, $4, 2.00, 'received', NOW(), NOW())
       ON CONFLICT (transaction_id) DO UPDATE SET
       status = 'received', received_date = NOW()
       RETURNING *`,
      [transactionId, transaction.rows[0].buyer_id, transaction.rows[0].selected_title_company_id, earnestMoneyAmount]
    );

    // Update transaction
    const updateResult = await pool.query(
      `UPDATE transactions 
       SET earnest_money_status = $1, earnest_money_amount = $2, earnest_money_verified_at = NOW(), 
           earnest_money_step = 6, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [verified ? 'verified' : 'verification_failed', earnestMoneyAmount, transactionId]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO earnest_money_audit_logs (transaction_id, user_id, action, old_status, new_status, details, created_at)
       VALUES ($1, $2, 'verify_earnest_money', 'confirmation_received', $3, $4::jsonb, NOW())`,
      [transactionId, req.user?.id || 1, verified ? 'verified' : 'verification_failed',
        JSON.stringify({ amount: earnestMoneyAmount, verified })]
    );



    const status = await pool.query(
      `UPDATE task_value
   SET status = 'completed'
   WHERE task_id IN ($1, $2, $3)
     AND transactions_id = $4`,
      [23, 24, 25, transactionId]
    );





    res.json({
      success: verified,
      message: verified ? 'Earnest money verified successfully' : 'Verification failed',
      transaction: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error verifying earnest money:', error);
    res.status(500).json({ error: 'Failed to verify earnest money' });
  }
});

// ==================== STATUS ENDPOINTS ====================

// Get earnest money status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT 
        earnest_money_status, 
        earnest_money_amount, 
        earnest_money_verified_at, 
        phone_verified,
        earnest_money_step,
        selected_title_company_id
       FROM transactions 
       WHERE id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching earnest money status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Get earnest money audit logs
router.get('/audit-logs/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT * FROM earnest_money_audit_logs 
       WHERE transaction_id = $1 
       ORDER BY created_at DESC`,
      [transactionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==================== TRANSACTION ENDPOINTS ====================

// Get transaction details
router.get('/transactions/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT 
        t.id,
        t.offer_id,
        t.property_id,
        t.buyer_id,
        t.seller_id,
        t.purchase_price,
        t.earnest_money_amount,
        t.earnest_money_percentage,
        t.earnest_money_status,
        t.earnest_money_step,
        t.phone_verified,
        t.selected_title_company_id,
        t.transaction_status,
        t.closing_date,
        t.created_at,
        p.address,
        p.city,
        p.state,
        p.zip_code,
        u_buyer.first_name as buyer_first_name,
        u_buyer.last_name as buyer_last_name,
        u_buyer.email as buyer_email,
        u_seller.first_name as seller_first_name,
        u_seller.last_name as seller_last_name
       FROM transactions t
       LEFT JOIN properties p ON t.property_id = p.id
       LEFT JOIN users u_buyer ON t.buyer_id = u_buyer.id
       LEFT JOIN users u_seller ON t.seller_id = u_seller.id
       WHERE t.id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    // Calculate earnest money if not set
    if (!transaction.earnest_money_amount && transaction.purchase_price) {
      transaction.earnest_money_amount = (transaction.purchase_price * 0.02).toFixed(2);
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Get transaction earnest money progress
router.get('/transactions/:transactionId/earnest-money-progress', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT * FROM earnest_money_progress_view WHERE transaction_id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching earnest money progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get transaction by offer ID
router.get('/transactions/by-offer/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;

    const result = await pool.query(
      'SELECT * FROM transactions WHERE offer_id = $1',
      [offerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No transaction found for this offer' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching transaction by offer:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Update transaction earnest money fields
router.patch('/transactions/:transactionId/earnest-money', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const {
      earnest_money_amount,
      earnest_money_percentage,
      earnest_money_status,
      earnest_money_step,
      phone_verified,
      selected_title_company_id
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (earnest_money_amount !== undefined) {
      updates.push(`earnest_money_amount = $${paramIndex}`);
      values.push(earnest_money_amount);
      paramIndex++;
    }

    if (earnest_money_percentage !== undefined) {
      updates.push(`earnest_money_percentage = $${paramIndex}`);
      values.push(earnest_money_percentage);
      paramIndex++;
    }

    if (earnest_money_status !== undefined) {
      updates.push(`earnest_money_status = $${paramIndex}`);
      values.push(earnest_money_status);
      paramIndex++;
    }

    if (earnest_money_step !== undefined) {
      updates.push(`earnest_money_step = $${paramIndex}`);
      values.push(earnest_money_step);
      paramIndex++;
    }

    if (phone_verified !== undefined) {
      updates.push(`phone_verified = $${paramIndex}`);
      values.push(phone_verified);
      paramIndex++;
    }

    if (selected_title_company_id !== undefined) {
      updates.push(`selected_title_company_id = $${paramIndex}`);
      values.push(selected_title_company_id);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(transactionId);

    const result = await pool.query(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
router.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
router.use((err, req, res, next) => {
  console.error('Route error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ error: 'File is too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: 'File upload error' });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = router;