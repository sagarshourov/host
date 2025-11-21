const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const upload = require('../middleware/insuranceUpload');

// Get insurance quotes
router.post('/quotes', async (req, res) => {
  try {
    const { propertyValue, location, squareFootage, yearBuilt } = req.body;

    // Simulate getting quotes from insurance providers
    const quotes = [
      {
        id: 1,
        company: 'State Farm',
        coverageType: 'HO-3',
        coverageLimit: propertyValue,
        deductible: 1000,
        monthlyPremium: 120,
        annualPremium: 1440,
        features: ['Dwelling Coverage', 'Personal Property', 'Liability Protection'],
        isRecommended: true
      },
      {
        id: 2,
        company: 'Allstate',
        coverageType: 'HO-3',
        coverageLimit: propertyValue,
        deductible: 1500,
        monthlyPremium: 110,
        annualPremium: 1320,
        features: ['Dwelling Coverage', 'Personal Property', 'Additional Living Expenses']
      }
    ];

    const recommendedInsurers = [
      { id: 1, name: 'State Farm' },
      { id: 2, name: 'Allstate' },
      { id: 3, name: 'Liberty Mutual' }
    ];

    res.json({ quotes, recommendedInsurers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase insurance policy
router.post('/purchase', async (req, res) => {
  try {
    const { transactionId, policyData, paymentData } = req.body;

    // Save policy to database
    const result = await pool.query(
      `INSERT INTO insurance_policies 
       (transaction_id, company, coverage_type, coverage_limit, deductible, premium, start_date, policy_number) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        transactionId,
        policyData.company,
        policyData.coverageType,
        policyData.coverageLimit,
        policyData.deductible,
        policyData.annualPremium,
        new Date(), // start date
        `POL-${Date.now()}`
      ]
    );

    // Update transaction status
    await pool.query(
      'UPDATE transactions SET insurance_status = $1 WHERE id = $2',
      ['purchased', transactionId]
    );

    res.json({ policy: result.rows[0], success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload insurance proof
router.post('/upload-proof', upload.single('proof'), async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Save proof to database
    await pool.query(
      `INSERT INTO insurance_documents 
       (transaction_id, document_type, file_path, file_name, uploaded_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        transactionId,
        'insurance_proof',
        req.file.path,
        req.file.originalname,
        new Date()
      ]
    );

    // Update transaction status
    await pool.query(
      'UPDATE transactions SET insurance_status = $1 WHERE id = $2',
      ['proof_uploaded', transactionId]
    );

    // Notify lender (simulated)
    // In real implementation, this would send email/notification to lender

    res.json({ success: true, message: 'Proof uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get coverage requirements from lender
router.get('/coverage-requirements/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Fetch lender requirements from database
    const result = await pool.query(
      `SELECT min_coverage, max_deductible, additional_requirements 
       FROM lender_requirements 
       WHERE transaction_id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      // Return default requirements if none set
      return res.json({
        minCoverage: 300000,
        maxDeductible: 2500,
        additionalRequirements: 'Must include liability coverage of at least $100,000'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;