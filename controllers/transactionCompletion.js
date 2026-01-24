const pool = require('../config/database');

exports.getCompletionData = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const query = `
      SELECT tc.*,  t.purchase_price, t.closing_date
      FROM transaction_completions tc
      JOIN transactions t ON tc.transaction_id = t.id::text
      WHERE tc.transaction_id = $1
    `;

    const result = await pool.query(query, [transactionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Completion data not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in getCompletionData:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.downloadDocuments = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // First, check if transaction exists
    const checkQuery = `SELECT id FROM transactions WHERE id::text = $1`;
    const checkResult = await pool.query(checkQuery, [transactionId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const documentPackage = {
      transaction_id: transactionId,
      files: [
        {
          id: 1,
          name: 'purchase_agreement.pdf',
          url: `/api/completion/documents/${transactionId}/purchase-agreement`,
          type: 'contract',
          size: '2.4 MB'
        },
        {
          id: 2,
          name: 'closing_disclosure.pdf',
          url: `/api/completion/documents/${transactionId}/closing-disclosure`,
          type: 'financial',
          size: '1.8 MB'
        },
        {
          id: 3,
          name: 'title_documents.pdf',
          url: `/api/completion/documents/${transactionId}/title-documents`,
          type: 'legal',
          size: '3.2 MB'
        },
        {
          id: 4,
          name: 'inspection_reports.pdf',
          url: `/api/completion/documents/${transactionId}/inspection-reports`,
          type: 'property',
          size: '4.1 MB'
        }
      ],
      total_size: '11.5 MB',
      generated_at: new Date().toISOString()
    };

    res.json(documentPackage);
  } catch (error) {
    console.error('Error in downloadDocuments:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.generateSavingsReport = async (req, res) => {
  try {
    const { transactionId } = req.params;
    let { sale_price } = req.body;

    // Convert sale_price to number
    sale_price = parseFloat(sale_price);
    if (isNaN(sale_price) || sale_price <= 0) {
      return res.status(400).json({ error: 'Invalid sale price' });
    }

    // Calculate savings
    const traditionalFee = sale_price * 0.06;
    const platformFee = sale_price * 0.025;
    const buyerSavings = sale_price * 0.04;

    const savingsReport = {
      transaction_id: transactionId,
      sale_price: sale_price.toFixed(2),
      traditional_agent_fee: traditionalFee.toFixed(2),
      traditional_fee_percentage: 6.0,
      platform_fee: platformFee.toFixed(2),
      platform_fee_percentage: 2.5,
      buyer_savings: buyerSavings.toFixed(2),
      buyer_savings_percentage: 4.0,
      net_seller_savings: (traditionalFee - platformFee).toFixed(2),
      summary: `You saved $${buyerSavings.toFixed(2)} (4%) compared to traditional 6% agent fees`,
      generated_at: new Date().toISOString()
    };

    // First, ensure transaction completion record exists
    const checkQuery = `
      SELECT id FROM transaction_completions WHERE transaction_id = $1
    `;

    const checkResult = await pool.query(checkQuery, [transactionId]);

    let updateResult;
    if (checkResult.rows.length === 0) {
      // Create new record if it doesn't exist
      const insertQuery = `
        INSERT INTO transaction_completions 
        (transaction_id, savings_report_generated, platform_fee_amount, updated_at)
        VALUES ($1, true, $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      updateResult = await pool.query(insertQuery, [transactionId, platformFee]);
    } else {
      // Update existing record
      const updateQuery = `
        UPDATE transaction_completions 
        SET savings_report_generated = true, 
            platform_fee_amount = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
        RETURNING *
      `;
      updateResult = await pool.query(updateQuery, [platformFee, transactionId]);
    }

    savingsReport.record_updated = updateResult.rows[0];

    res.json(savingsReport);
  } catch (error) {
    console.error('Error in generateSavingsReport:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.requestReview = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { userId } = req.body;

    // First check if transaction exists
    const checkQuery = `SELECT id FROM transactions WHERE id::text = $1`;
    const checkResult = await pool.query(checkQuery, [transactionId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update or create completion record
    const updateQuery = `
      INSERT INTO transaction_completions (transaction_id, review_requested, updated_at)
      VALUES ($1, true, CURRENT_TIMESTAMP)
      ON CONFLICT (transaction_id) 
      DO UPDATE SET review_requested = true, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    await pool.query(updateQuery, [transactionId]);

    const reviewData = {
      transaction_id: transactionId,
      user_id: userId,
      message: 'Thank you for your feedback!',
      review_link: `/review/${transactionId}`,
      incentives: {
        survey_completion: 'Entered into $500 prize drawing',
        detailed_review: 'Get $50 credit on next transaction'
      },
      requested_at: new Date().toISOString()
    };

    res.json(reviewData);
  } catch (error) {
    console.error('Error in requestReview:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.activateReferral = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    // Generate unique referral code
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    const referralCode = `REF-${timestamp}-${randomStr}`;

    const referralProgram = {
      active: true,
      user_id: userId,
      referral_code: referralCode,
      rewards: {
        buyer_referral: 500,
        seller_referral: 250,
        bonus_after_three: 1000
      },
      stats: {
        referrals_count: 0,
        total_earned: 0,
        pending_rewards: 0
      },
      shareable_links: {
        facebook: `https://yourplatform.com/ref/${referralCode}`,
        twitter: `https://yourplatform.com/ref/${referralCode}`,
        whatsapp: `https://wa.me/?text=Check%20this%20real%20estate%20platform:%20https://yourplatform.com/ref/${referralCode}`,
        email: `mailto:?subject=Real%20Estate%20Platform%20Recommendation&body=I%20saved%204%%20on%20my%20home%20purchase!%20Check%20it%20out:%20https://yourplatform.com/ref/${referralCode}`,
        direct: `https://yourplatform.com/ref/${referralCode}`
      },
      activated_at: new Date().toISOString()
    };

    // Save referral code to database
    const insertQuery = `
      INSERT INTO user_referrals (user_id, referral_code, created_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET referral_code = $2, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [userId, referralCode]);

    referralProgram.database_record = result.rows[0];

    res.json(referralProgram);
  } catch (error) {
    console.error('Error in activateReferral:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.collectPlatformFee = async (req, res) => {
  try {
    const { transactionId } = req.params;
    let { sale_price } = req.body;

    // Validate and convert sale_price
    sale_price = parseFloat(sale_price);
    if (isNaN(sale_price) || sale_price <= 0) {
      return res.status(400).json({ error: 'Valid sale price is required' });
    }

    const platformFee = sale_price * 0.025;

    // First check if transaction exists
    const checkQuery = `SELECT id FROM transactions WHERE id::text = $1`;
    const checkResult = await pool.query(checkQuery, [transactionId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update or create completion record
    const updateQuery = `
      INSERT INTO transaction_completions 
      (transaction_id, platform_fee_collected, platform_fee_amount, updated_at)
      VALUES ($1, true, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (transaction_id) 
      DO UPDATE SET 
        platform_fee_collected = true, 
        platform_fee_amount = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const completionResult = await pool.query(updateQuery, [transactionId, platformFee]);

    // Log fee collection
    const logQuery = `
      INSERT INTO fee_collections (transaction_id, amount, percentage, collected_at)
      VALUES ($1, $2, 2.5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const logResult = await pool.query(logQuery, [transactionId, platformFee]);

    res.json({
      success: true,
      message: `Platform fee of $${platformFee.toFixed(2)} (2.5%) collected successfully`,
      fee_details: {
        amount: platformFee,
        percentage: 2.5,
        sale_price: sale_price.toFixed(2),
        collection_date: new Date().toISOString()
      },
      receipt: `FEE-${transactionId.slice(0, 8)}-${Date.now().toString(36)}`,
      database_log: logResult.rows[0],
      completion_record: completionResult.rows[0]
    });
  } catch (error) {
    console.error('Error in collectPlatformFee:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get completion status
exports.getCompletionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const query = `
      SELECT 
        documents_compiled,
        savings_report_generated,
        platform_fee_collected,
        referral_program_activated,
        review_requested,
        created_at,
        updated_at
      FROM transaction_completions 
      WHERE transaction_id = $1
    `;

    const result = await pool.query(query, [transactionId]);

    if (result.rows.length === 0) {
      // Return default status if no record exists
      return res.json({
        documents_compiled: false,
        savings_report_generated: false,
        platform_fee_collected: false,
        referral_program_activated: false,
        review_requested: false,
        status: 'not_started'
      });
    }

    const status = result.rows[0];

    // Calculate overall completion percentage
    const totalSteps = 5;
    let completedSteps = 0;
    if (status.documents_compiled) completedSteps++;
    if (status.savings_report_generated) completedSteps++;
    if (status.platform_fee_collected) completedSteps++;
    if (status.referral_program_activated) completedSteps++;
    if (status.review_requested) completedSteps++;

    const completionPercentage = (completedSteps / totalSteps) * 100;

    res.json({
      ...status,
      completion_percentage: completionPercentage,
      completed_steps: completedSteps,
      total_steps: totalSteps,
      status: completionPercentage === 100 ? 'completed' : 'in_progress'
    });
  } catch (error) {
    console.error('Error in getCompletionStatus:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mark step as complete
exports.completeStep = async (req, res) => {
  try {
    const { transactionId, step } = req.params;

    const validSteps = {
      'documents': 'documents_compiled',
      'savings-report': 'savings_report_generated',
      'fee-collection': 'platform_fee_collected',
      'referral': 'referral_program_activated',
      'review': 'review_requested'
    };

    const dbColumn = validSteps[step];
    if (!dbColumn) {
      return res.status(400).json({
        error: 'Invalid step',
        valid_steps: Object.keys(validSteps)
      });
    }

    const updateQuery = `
      INSERT INTO transaction_completions (transaction_id, ${dbColumn}, updated_at)
      VALUES ($1, true, CURRENT_TIMESTAMP)
      ON CONFLICT (transaction_id) 
      DO UPDATE SET ${dbColumn} = true, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [transactionId]);

    res.json({
      success: true,
      message: `Step "${step}" marked as complete`,
      step: step,
      database_column: dbColumn,
      data: result.rows[0],
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in completeStep:', error);
    res.status(500).json({ error: error.message });
  }
};