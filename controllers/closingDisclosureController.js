// controllers/closingDisclosureController.js
const pool = require('../config/database');
//const { sendEmail } = require('../utils/emailService');

// Get Closing Disclosure
exports.getClosingDisclosure = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this transaction
    const accessCheck = await pool.query(
      `SELECT t.* FROM transactions t
       WHERE t.id = $1 AND t.buyer_id = $2`,
      [transactionId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT cd.*, p.street_address, t.closing_date
       FROM closing_disclosures cd
       JOIN transactions t ON cd.transaction_id = t.id
       JOIN properties p ON p.id = t.property_id
       WHERE cd.transaction_id = $1
       ORDER BY cd.created_at DESC
       LIMIT 1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Closing disclosure not found' });
    }

    // Calculate days until closing
    const closingDate = new Date(result.rows[0].closing_date);
    const today = new Date();
    const daysUntilClosing = Math.ceil((closingDate - today) / (1000 * 60 * 60 * 24));

    const closingDisclosure = {
      ...result.rows[0],
      daysUntilClosing
    };

    res.json(closingDisclosure);
  } catch (error) {
    console.error('Error fetching closing disclosure:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload Closing Disclosure
exports.uploadClosingDisclosure = async (req, res) => {
  const client = await pool.connect();

  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    await client.query('BEGIN');

    // Verify user has access
    const accessCheck = await client.query(
      `SELECT * FROM transactions WHERE id = $1 AND buyer_id = $2`,
      [transactionId, userId]
    );

    if (accessCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Insert closing disclosure
    const result = await client.query(
      `INSERT INTO closing_disclosures 
       (transaction_id, file_path, uploaded_by, received_date, status)
       VALUES ($1, $2, $3, NOW(), 'pending_review')
       RETURNING *`,
      [transactionId, file.path, userId]
    );

    // Update transaction status
    await client.query(
      `UPDATE transactions 
       SET status = 'closing_disclosure_received', 
           updated_at = NOW()
       WHERE id = $1`,
      [transactionId]
    );

    // Create activity log
    await client.query(
      `INSERT INTO transaction_activities 
       (transaction_id, user_id, activity_type, description)
       VALUES ($1, $2, 'closing_disclosure_uploaded', 'Closing disclosure has been uploaded')`,
      [transactionId, userId]
    );

    await client.query('COMMIT');

    // Send notification email
    const transaction = accessCheck.rows[0];
    // await sendEmail({
    //   to: transaction.buyer_email,
    //   subject: 'Closing Disclosure Received',
    //   template: 'closing-disclosure-received',
    //   data: {
    //     propertyAddress: transaction.property_address,
    //     closingDate: transaction.closing_date
    //   }
    // });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading closing disclosure:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// Get Loan Estimate
exports.getLoanEstimate = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT le.* FROM loan_estimates le
       JOIN transactions t ON le.transaction_id = t.id
       WHERE le.transaction_id = $1 AND tp.user_id = $2
       ORDER BY le.created_at DESC
       LIMIT 1`,
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Loan estimate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching loan estimate:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Calculate Cash to Close
exports.calculateCashToClose = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT 
         cd.total_closing_costs,
         cd.down_payment,
         cd.loan_amount,
         t.purchase_price
       FROM closing_disclosures cd
       JOIN transactions t ON cd.transaction_id = t.id
       WHERE cd.transaction_id = $1
       ORDER BY cd.created_at DESC
       LIMIT 1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Closing disclosure not found' });
    }

    const { total_closing_costs, down_payment } = result.rows[0];
    const cashToClose = parseFloat(total_closing_costs) + parseFloat(down_payment);

    res.json({
      totalClosingCosts: total_closing_costs,
      downPayment: down_payment,
      cashToClose: cashToClose.toFixed(2),
      breakdown: {
        downPayment: down_payment,
        closingCosts: total_closing_costs
      }
    });
  } catch (error) {
    console.error('Error calculating cash to close:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Flag Discrepancy
exports.flagDiscrepancy = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;
    const { feeItem, estimatedAmount, actualAmount, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO closing_discrepancies 
       (transaction_id, reported_by, fee_item, estimated_amount, actual_amount, difference, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        transactionId,
        userId,
        feeItem,
        estimatedAmount,
        actualAmount,
        actualAmount - estimatedAmount,
        notes
      ]
    );

    // Create activity log
    await pool.query(
      `INSERT INTO transaction_activities 
       (transaction_id, user_id, activity_type, description)
       VALUES ($1, $2, 'discrepancy_reported', $3)`,
      [transactionId, userId, `Discrepancy reported for ${feeItem}`]
    );

    // Notify lender
    const transaction = await pool.query(
      `SELECT t.*, u.email as lender_email
       FROM transactions t
       JOIN users u ON t.lender_id = u.id
       WHERE t.id = $1`,
      [transactionId]
    );

    if (transaction.rows.length > 0) {
      // await sendEmail({
      //   to: transaction.rows[0].lender_email,
      //   subject: 'Closing Disclosure Discrepancy Reported',
      //   template: 'discrepancy-reported',
      //   data: {
      //     feeItem,
      //     estimatedAmount,
      //     actualAmount,
      //     difference: actualAmount - estimatedAmount,
      //     propertyAddress: transaction.rows[0].property_address
      //   }
      // });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error flagging discrepancy:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Discrepancies
exports.getDiscrepancies = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await pool.query(
      `SELECT cd.*, u.full_name as reported_by_name
       FROM closing_discrepancies cd
       JOIN users u ON cd.reported_by = u.id
       WHERE cd.transaction_id = $1
       ORDER BY cd.created_at DESC`,
      [transactionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching discrepancies:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download Document
exports.downloadDocument = async (req, res) => {
  try {
    const { transactionId, documentType } = req.params;
    const userId = req.user.userId;

    let query;
    if (documentType === 'closing-disclosure') {
      query = `SELECT file_path FROM closing_disclosures WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1`;
    } else if (documentType === 'loan-estimate') {
      query = `SELECT file_path FROM loan_estimates WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1`;
    } else {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const result = await pool.query(query, [transactionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = result.rows[0].file_path;
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Wire Instructions
exports.getWireInstructions = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT wi.*, t.property_address, cd.cash_to_close
       FROM wire_instructions wi
       JOIN transactions t ON wi.transaction_id = t.id
       JOIN closing_disclosures cd ON t.id = cd.transaction_id
       WHERE wi.transaction_id = $1
       ORDER BY cd.created_at DESC, wi.created_at DESC
       LIMIT 1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Wire instructions not found' });
    }

    // Log access to wire instructions for security
    await pool.query(
      `INSERT INTO security_logs 
       (user_id, action, resource_type, resource_id, ip_address)
       VALUES ($1, 'view_wire_instructions', 'transaction', $2, $3)`,
      [userId, transactionId, req.ip]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching wire instructions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Closing Disclosure
exports.updateClosingDisclosure = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    const result = await pool.query(
      `UPDATE closing_disclosures 
       SET ${Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ')},
           updated_at = NOW()
       WHERE transaction_id = $1
       RETURNING *`,
      [transactionId, ...Object.values(updates)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Closing disclosure not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating closing disclosure:', error);
    res.status(500).json({ message: 'Server error' });
  }
};