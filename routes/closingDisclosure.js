// routes/closing.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// routes/closing.js - Updated to join with fee tables
router.get('/:id/closing', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch closing disclosure with fees
    const disclosureQuery = `
      SELECT cd.*, 
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', cf.id,
                 'category', cf.category,
                 'description', cf.description,
                 'amount', cf.amount,
                 'paidBy', cf.paid_by
               ) ORDER BY cf.id
             ) as fees
      FROM closing_disclosures cd
      LEFT JOIN closing_fees cf ON cd.id = cf.closing_disclosure_id
      WHERE cd.transaction_id = $1
      GROUP BY cd.id
    `;
    const disclosureResult = await db.query(disclosureQuery, [id]);
    
    // Fetch loan estimate with fees
    const loanEstimateQuery = `
      SELECT le.*,
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', lef.id,
                 'category', lef.category,
                 'description', lef.description,
                 'amount', lef.amount,
                 'paidBy', lef.paid_by
               ) ORDER BY lef.id
             ) as fees
      FROM loan_estimates le
      LEFT JOIN loan_estimate_fees lef ON le.id = lef.loan_estimate_id
      WHERE le.transaction_id = $1
      GROUP BY le.id
    `;
    const loanEstimateResult = await db.query(loanEstimateQuery, [id]);
    


    

    // Get wire instructions
    const wireInstructionsQuery = `
      SELECT * FROM wire_instructions WHERE transaction_id = $1 LIMIT 1
    `;
    const wireInstructionsResult = await db.query(wireInstructionsQuery, [id]);
    
    // Calculate total due (sum of buyer fees from closing disclosure)
    const buyerFees = disclosureResult.rows[0]?.fees?.filter(fee => fee.paidBy === 'buyer') || [];
    const totalDue = buyerFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
    
    res.json({
      disclosure: disclosureResult.rows[0],
      loanEstimate: loanEstimateResult.rows[0],
      totalDue: totalDue,
      wireInstructions: wireInstructionsResult.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Initiate Payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method } = req.body;
    
    // Record payment initiation
    const paymentQuery = `
      INSERT INTO payment_instructions (transaction_id, amount, method, initiated_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    await db.query(paymentQuery, [id, amount, method]);
    
    // Update transaction status
    // const updateQuery = `
    //   UPDATE transactions 
    //   SET closing_payment_initiated = true, 
    //       payment_method = $1,
    //       updated_at = NOW()
    //   WHERE id = $2
    // `;
    // await db.query(updateQuery, [method, id]);
    
    res.json({ success: true, message: 'Payment instructions sent' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;