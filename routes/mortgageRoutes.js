const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const upload = require('../middleware/upload');

// Submit mortgage application
router.post('/applications', async (req, res) => {

  try {
    const {
      lender_id,
      buyer_id,
      property_id,
      loan_amount,
      employment_history,
      assets,
      debts,
      personal_info,
      transaction_id
    } = req.body;



    // Insert main application
    const applicationResult = await pool.query(
      `INSERT INTO mortgage_applications 
       (lender_id, buyer_id, property_id, loan_amount, status, application_data , transaction_id) 
       VALUES ($1, $2, $3, $4, 'submitted', $5 , $6) 
       RETURNING *`,
      [lender_id, buyer_id, property_id, loan_amount, JSON.stringify({
        employment_history,
        assets,
        debts,
        personal_info
      }), transaction_id]
    );

    // Create appraisal payment record
    const appraisalResult = await pool.query(
      `INSERT INTO payments 
       (application_id, amount, type, status , transaction_id ) 
       VALUES ($1, $2, 'appraisal', 'pending', $3) 
       RETURNING *`,
      [applicationResult.rows[0].id, 550, transaction_id] // $500-600 appraisal fee
    );

    /// await client.query('COMMIT');

    res.json({
      application: applicationResult.rows[0],
      appraisal: appraisalResult.rows[0]
    });
  } catch (error) {
    // await client.query('ROLLBACK');
    console.error('Application submission error:', error);
    res.status(500).json({ message: 'Failed to submit application' });
  } finally {
    // client.release();
  }
});

// Upload documents
router.post('/documents', upload.array('documents', 10), async (req, res) => {
  try {
    const { applicationId } = req.body;
    const files = req.files;

    const documentPromises = files.map(file =>
      pool.query(
        `INSERT INTO mortgage_documents 
         (application_id, document_type, file_name, file_path, uploaded_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [applicationId, file.mimetype, file.originalname, file.path]
      )
    );

    await Promise.all(documentPromises);

    res.json({ message: 'Documents uploaded successfully', count: files.length });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ message: 'Failed to upload documents' });
  }
});

// Get application status
router.get('/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ma.*, l.name as lender_name, 
              json_agg(ad.*) as documents,
              p.status as payment_status
       FROM mortgage_applications ma
       LEFT JOIN lenders l ON ma.lender_id = l.id
       LEFT JOIN mortgage_documents ad ON ma.id = ad.application_id
       LEFT JOIN payments p ON ma.id = p.application_id AND p.type = 'appraisal'
       WHERE ma.id = $1
       GROUP BY ma.id, l.name, p.status`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ message: 'Failed to get application status' });
  }
});

// Get recommended lenders
router.get('/lenders', async (req, res) => {
  try {
    const { location } = req.query;

    const result = await pool.query(
      `SELECT id, name, address, phone, email, 
              interest_rate, rating, specialties
       FROM lenders 
       WHERE location ILIKE $1 OR serves_nationwide = true
       ORDER BY rating DESC, interest_rate ASC
       LIMIT 10`,
      [`%${location}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Lenders fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch lenders' });
  }
});

module.exports = router;