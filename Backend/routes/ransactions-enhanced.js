// routes/transactions-enhanced.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const moment = require('moment');

// Get all transactions for a user with progress
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT t.*, 
        COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'completed') as completed_steps,
        COUNT(DISTINCT task_p.id) FILTER (WHERE task_p.status = 'completed') as completed_tasks,
        COUNT(DISTINCT tasks.id) as total_tasks,
        CASE 
          WHEN t.closing_date IS NOT NULL 
          THEN DATE_PART('day', t.closing_date - CURRENT_DATE)
          ELSE NULL 
        END as days_to_closing
      FROM transactions t
      LEFT JOIN transaction_progress tp ON t.id = tp.transaction_id
      LEFT JOIN task_progress task_p ON t.id = task_p.transaction_id
      LEFT JOIN transaction_steps ts ON tp.step_id = ts.id
      LEFT JOIN tasks ON ts.id = tasks.step_id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction with full 25-step details
router.get('/:id/full', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get transaction details
    const transactionResult = await db.query(
      `SELECT t.*, 
        COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'completed') as completed_steps,
        COUNT(DISTINCT task_p.id) FILTER (WHERE task_p.status = 'completed') as completed_tasks,
        COUNT(DISTINCT tasks.id) as total_tasks,
        CASE 
          WHEN t.closing_date IS NOT NULL 
          THEN DATE_PART('day', t.closing_date - CURRENT_DATE)
          ELSE NULL 
        END as days_to_closing,
        ROUND((COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'completed')::DECIMAL / 25) * 100, 1) as progress_percentage
      FROM transactions t
      LEFT JOIN transaction_progress tp ON t.id = tp.transaction_id
      LEFT JOIN task_progress task_p ON t.id = task_p.transaction_id
      LEFT JOIN transaction_steps ts ON tp.step_id = ts.id
      LEFT JOIN tasks ON ts.id = tasks.step_id
      WHERE t.id = $1 AND t.user_id = $2
      GROUP BY t.id`,
      [id, userId]
    );
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Get all phases with their steps
    const phasesResult = await db.query(
      `SELECT 
        p.id as phase_id,
        p.name as phase_name,
        p.display_name,
        p.icon,
        json_agg(
          json_build_object(
            'id', s.id,
            'step_number', s.step_number,
            'title', s.title,
            'description', s.description,
            'status', COALESCE(tp.status, 'pending'),
            'started_at', tp.started_at,
            'completed_at', tp.completed_at,
            'notes', tp.notes,
            'details', (
              SELECT json_object_agg(sd.detail_key, sd.detail_value)
              FROM step_details sd
              WHERE sd.transaction_id = $1 AND sd.step_id = s.id
            ),
            'tasks', (
              SELECT json_agg(
                json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'status', COALESCE(task_p.status, 'pending'),
                  'completed_at', task_p.completed_at
                ) ORDER BY t.display_order
              )
              FROM tasks t
              LEFT JOIN task_progress task_p ON t.id = task_p.task_id AND task_p.transaction_id = $1
              WHERE t.step_id = s.id
            )
          ) ORDER BY s.display_order
        ) as steps
      FROM transaction_phases p
      LEFT JOIN transaction_steps s ON p.id = s.phase_id
      LEFT JOIN transaction_progress tp ON s.id = tp.step_id AND tp.transaction_id = $1
      GROUP BY p.id, p.display_order
      ORDER BY p.display_order`,
      [id]
    );
    
    // Get milestones
    const milestonesResult = await db.query(
      `SELECT m.*, s.title as step_title 
      FROM milestones m
      LEFT JOIN transaction_steps s ON m.step_id = s.id
      WHERE m.transaction_id = $1 
      ORDER BY m.due_date ASC`,
      [id]
    );
    
    const transaction = transactionResult.rows[0];
    transaction.phases = phasesResult.rows;
    transaction.milestones = milestonesResult.rows;
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
});

// Create new transaction with all 25 steps initialized
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    const {
      property_address,
      purchase_price,
      list_price,
      offer_price,
      down_payment_percentage,
      closing_date,
      lender_name,
      pre_approval_amount,
      interest_rate,
      title_company,
      escrow_holder
    } = req.body;
    
    // Calculate values
    const platformFee = 2.5;
    const traditionalCommission = purchase_price * 0.06;
    const platformCommission = purchase_price * (platformFee / 100);
    const savings = traditionalCommission - platformCommission;
    const earnestMoney = purchase_price * 0.02;
    const loanAmount = purchase_price * (1 - (down_payment_percentage || 20) / 100);
    
    // Begin transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create transaction
      const transactionResult = await client.query(
        `INSERT INTO transactions 
        (user_id, property_address, purchase_price, list_price, offer_price, 
         final_price, down_payment_percentage, closing_date, platform_fee_percentage, 
         savings, buyer_rating, status, earnest_money, loan_amount,
         lender_name, pre_approval_amount, interest_rate, title_company, escrow_holder)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [userId, property_address, purchase_price, list_price || purchase_price,
         offer_price || purchase_price, purchase_price, down_payment_percentage || 20,
         closing_date, platformFee, savings, 'A+', 'active', earnestMoney, loanAmount,
         lender_name, pre_approval_amount, interest_rate, title_company || 'Atlantic Title',
         escrow_holder || 'Atlantic Title']
      );
      
      const transaction = transactionResult.rows[0];
      
      // Get all steps
      const stepsResult = await client.query(
        'SELECT id, step_number FROM transaction_steps ORDER BY display_order'
      );
      
      // Initialize progress for all 25 steps
      for (const step of stepsResult.rows) {
        const status = step.step_number <= 7 ? 'completed' : 
                      step.step_number === 8 ? 'in-progress' : 'pending';
        const completedAt = status === 'completed' ? new Date() : null;
        
        await client.query(
          `INSERT INTO transaction_progress (transaction_id, step_id, status, completed_at)
          VALUES ($1, $2, $3, $4)`,
          [transaction.id, step.id, status, completedAt]
        );
      }
      
      // Get all tasks and initialize their progress
      const tasksResult = await client.query(
        `SELECT t.id, t.step_id, s.step_number 
        FROM tasks t 
        JOIN transaction_steps s ON t.step_id = s.id`
      );
      
      for (const task of tasksResult.rows) {
        const status = task.step_number <= 7 ? 'completed' : 
                      task.step_number === 8 && task.id <= 26 ? 'completed' :
                      task.step_number === 8 && task.id === 27 ? 'in-progress' : 'pending';
        const completedAt = status === 'completed' ? new Date() : null;
        
        await client.query(
          `INSERT INTO task_progress (transaction_id, task_id, status, completed_at)
          VALUES ($1, $2, $3, $4)`,
          [transaction.id, task.id, status, completedAt]
        );
      }
      
      // Add step details for completed steps
      const stepDetails = [
        // Step 1: Pre-Approval
        { step: 1, details: {
          lender: lender_name || 'First National Bank',
          amount: `$${pre_approval_amount || purchase_price * 1.15}`,
          rate: `${interest_rate || 6.5}%`,
          expiry: '90 days',
          buyerRating: 'A+'
        }},
        // Step 2: Property Search
        { step: 2, details: {
          viewings: '7 properties',
          selected: property_address,
          listPrice: `$${list_price || purchase_price}`,
          comps: '3 similar sales'
        }},
        // Step 3: Submit Offer
        { step: 3, details: {
          offerPrice: `$${offer_price || purchase_price}`,
          downPayment: `${down_payment_percentage || 20}%`,
          earnestMoney: '2%',
          expiry: '72 hours'
        }},
        // Step 4: Negotiation
        { step: 4, details: {
          counterOffers: '1',
          finalPrice: `$${purchase_price}`,
          closingDate: moment(closing_date).format('MMMM D'),
          concessions: 'None'
        }},
        // Step 5: Purchase Agreement
        { step: 5, details: {
          contractType: 'NJ Standard',
          pages: '10',
          signatures: 'Both parties',
          timestamp: moment().subtract(10, 'days').format('MMM D, YYYY h:mm A')
        }},
        // Step 6: Attorney Review
        { step: 6, details: {
          startDate: moment().subtract(9, 'days').format('MMM D'),
          endDate: moment().subtract(6, 'days').format('MMM D'),
          modifications: 'None',
          status: 'Approved'
        }},
        // Step 7: Earnest Money
        { step: 7, details: {
          amount: `$${earnestMoney.toFixed(0)} (2%)`,
          method: 'Wire transfer',
          escrowHolder: escrow_holder || 'Atlantic Title',
          depositDate: moment().subtract(5, 'days').format('MMM D')
        }},
        // Step 8: Home Inspection (in progress)
        { step: 8, details: {
          inspector: 'SafeGuard Inspections',
          scheduledDate: moment().add(2, 'days').format('MMM D'),
          duration: '3 hours',
          reportDue: moment().add(3, 'days').format('MMM D')
        }}
      ];
      
      // Insert step details
      for (const { step, details } of stepDetails) {
        const stepId = stepsResult.rows.find(s => s.step_number === step).id;
        for (const [key, value] of Object.entries(details)) {
          await client.query(
            `INSERT INTO step_details (transaction_id, step_id, detail_key, detail_value)
            VALUES ($1, $2, $3, $4)`,
            [transaction.id, stepId, key, value]
          );
        }
      }
      
      // Create milestones based on closing date
      const milestones = [
        {
          title: 'Home Inspection Scheduled',
          due_date: moment().add(2, 'days').format('YYYY-MM-DD'),
          milestone_type: 'inspection',
          step_id: 8
        },
        {
          title: 'Property Appraisal',
          due_date: moment(closing_date).subtract(25, 'days').format('YYYY-MM-DD'),
          milestone_type: 'appraisal',
          step_id: 11
        },
        {
          title: 'Clear to Close Expected',
          due_date: moment(closing_date).subtract(7, 'days').format('YYYY-MM-DD'),
          milestone_type: 'closing',
          step_id: 12
        },
        {
          title: 'Final Walk-Through',
          due_date: moment(closing_date).subtract(1, 'days').format('YYYY-MM-DD'),
          milestone_type: 'walkthrough',
          step_id: 17
        },
        {
          title: 'Closing Day! 🎉',
          due_date: closing_date,
          milestone_type: 'closing',
          step_id: 19
        }
      ];
      
      for (const milestone of milestones) {
        await client.query(
          `INSERT INTO milestones (transaction_id, title, due_date, milestone_type, step_id, status)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [transaction.id, milestone.title, milestone.due_date, milestone.milestone_type, 
           milestone.step_id, 'pending']
        );
      }
      
      await client.query('COMMIT');
      
      res.status(201).json(transaction);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update step status
router.put('/:id/steps/:stepId', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id, stepId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    
    // Verify transaction ownership
    const transactionCheck = await db.query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const startedAt = status === 'in-progress' ? new Date() : null;
    const completedAt = status === 'completed' ? new Date() : null;
    
    const result = await db.query(
      `INSERT INTO transaction_progress (transaction_id, step_id, status, notes, started_at, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (transaction_id, step_id)
      DO UPDATE SET 
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        started_at = CASE 
          WHEN EXCLUDED.status = 'in-progress' THEN COALESCE(transaction_progress.started_at, EXCLUDED.started_at)
          ELSE transaction_progress.started_at
        END,
        completed_at = EXCLUDED.completed_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [id, stepId, status, notes, startedAt, completedAt]
    );
    
    // Update transaction current_step if completing a step
    if (status === 'completed') {
      await db.query(
        `UPDATE transactions 
        SET current_step = current_step + 1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND current_step < 25`,
        [id]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// Update task status
router.put('/:id/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id, taskId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    
    // Verify transaction ownership
    const transactionCheck = await db.query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const completedAt = status === 'completed' ? new Date() : null;
    
    const result = await db.query(
      `INSERT INTO task_progress (transaction_id, task_id, status, notes, completed_at, completed_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (transaction_id, task_id)
      DO UPDATE SET 
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        completed_at = EXCLUDED.completed_at,
        completed_by = EXCLUDED.completed_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [id, taskId, status, notes, completedAt, userId]
    );
    
    // Check if all tasks in the step are completed
    const stepCheckResult = await db.query(
      `SELECT 
        s.id as step_id,
        COUNT(t.id) as total_tasks,
        COUNT(tp.id) FILTER (WHERE tp.status = 'completed') as completed_tasks
      FROM tasks t
      JOIN transaction_steps s ON t.step_id = s.id
      LEFT JOIN task_progress tp ON t.id = tp.task_id AND tp.transaction_id = $1
      WHERE t.id = $2
      GROUP BY s.id`,
      [id, taskId]
    );
    
    if (stepCheckResult.rows.length > 0) {
      const stepData = stepCheckResult.rows[0];
      if (stepData.total_tasks === stepData.completed_tasks) {
        // All tasks completed, mark step as completed
        await db.query(
          `UPDATE transaction_progress 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE transaction_id = $1 AND step_id = $2`,
          [id, stepData.step_id]
        );
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Update step details
router.put('/:id/steps/:stepId/details', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id, stepId } = req.params;
    const { details } = req.body; // Object with key-value pairs
    const userId = req.user.id;
    
    // Verify transaction ownership
    const transactionCheck = await db.query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update or insert each detail
      for (const [key, value] of Object.entries(details)) {
        await client.query(
          `INSERT INTO step_details (transaction_id, step_id, detail_key, detail_value)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (transaction_id, step_id, detail_key)
          DO UPDATE SET 
            detail_value = EXCLUDED.detail_value,
            updated_at = CURRENT_TIMESTAMP`,
          [id, stepId, key, value]
        );
      }
      
      await client.query('COMMIT');
      
      // Return all details for this step
      const result = await client.query(
        `SELECT detail_key, detail_value 
        FROM step_details 
        WHERE transaction_id = $1 AND step_id = $2`,
        [id, stepId]
      );
      
      const detailsObject = {};
      result.rows.forEach(row => {
        detailsObject[row.detail_key] = row.detail_value;
      });
      
      res.json(detailsObject);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating step details:', error);
    res.status(500).json({ error: 'Failed to update step details' });
  }
});

// Get transaction statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT 
        t.*,
        COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'completed') as completed_steps,
        COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'in-progress') as in_progress_steps,
        COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'pending') as pending_steps,
        COUNT(DISTINCT task_p.id) FILTER (WHERE task_p.status = 'completed') as completed_tasks,
        COUNT(DISTINCT task_p.id) FILTER (WHERE task_p.status = 'in-progress') as in_progress_tasks,
        COUNT(DISTINCT task_p.id) FILTER (WHERE task_p.status = 'pending') as pending_tasks,
        COUNT(DISTINCT tasks.id) as total_tasks,
        CASE 
          WHEN t.closing_date IS NOT NULL 
          THEN DATE_PART('day', t.closing_date - CURRENT_DATE)
          ELSE NULL 
        END as days_to_closing,
        ROUND((COUNT(DISTINCT tp.id) FILTER (WHERE tp.status = 'completed')::DECIMAL / 25) * 100, 1) as step_progress,
        ROUND((COUNT(DISTINCT task_p.id) FILTER (WHERE task_p.status = 'completed')::DECIMAL / COUNT(DISTINCT tasks.id)) * 100, 1) as task_progress
      FROM transactions t
      LEFT JOIN transaction_progress tp ON t.id = tp.transaction_id
      LEFT JOIN task_progress task_p ON t.id = task_p.transaction_id
      LEFT JOIN transaction_steps ts ON tp.step_id = ts.id
      LEFT JOIN tasks ON ts.id = tasks.step_id
      WHERE t.id = $1 AND t.user_id = $2
      GROUP BY t.id`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;