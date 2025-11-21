// controllers/inspectionController.js
const asyncHandler = require('express-async-handler');
const db = require('../config/database');

// @desc    Get available inspectors
// @route   GET /api/inspections/inspectors
// @access  Public
const getInspectors = asyncHandler(async (req, res) => {
  const { city, state, specialties } = req.query;

  let query = `
    SELECT * FROM inspectors 
    WHERE is_active = true
  `;
  const params = [];

  if (city) {
    params.push(`%${city}%`);
    query += ` AND city ILIKE $${params.length}`;
  }

  if (state) {
    params.push(state);
    query += ` AND state = $${params.length}`;
  }

  if (specialties) {
    const specialtyArray = specialties.split(',');
    params.push(specialtyArray);
    query += ` AND specialties && $${params.length}`;
  }

  query += ` ORDER BY rating DESC, review_count DESC`;

  const result = await db.query(query, params);
  res.json(result.rows);
});

// @desc    Schedule inspection
// @route   POST /api/inspections/schedule
// @access  Private
const scheduleInspection = asyncHandler(async (req, res) => {
  const { transactionId, inspectorId, scheduledDate, inspectionFee } = req.body;
  const userId = req.user.userId;

  // Verify user has access to transaction
  const transactionCheck = await db.query(
    'SELECT * FROM transactions WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
    [transactionId, userId]
  );

  if (transactionCheck.rows.length === 0) {
    res.status(404);
    throw new Error('Transaction not found or access denied' + userId);
  }

  const result = await db.query(
    `INSERT INTO inspections (transaction_id, inspector_id, scheduled_date, inspection_fee, status)
     VALUES ($1, $2, $3, $4, 'scheduled')
     RETURNING *`,
    [transactionId, parseInt(inspectorId), scheduledDate, inspectionFee]
  );

  await db.query(
    `UPDATE task_value 
   SET status = 'completed'
   WHERE task_id IN ($1, $2, $3, $4)
     AND transactions_id = $5`,
    [26, 27, 28, 29, transactionId]
  );

  res.status(201).json(result.rows[0]);
});

// @desc    Get inspection details
// @route   GET /api/inspections/:id
// @access  Private
const getInspection = asyncHandler(async (req, res) => {
  const inspectionId = req.params.userId;

  const inspectionResult = await db.query(
    `SELECT i.*, ins.name as inspector_name, ins.company, ins.license_number,
            t.address, t.city, t.state, t.zip_code
     FROM inspections i
     LEFT JOIN inspectors ins ON i.inspector_id = ins.id
     LEFT JOIN transactions t ON i.transaction_id = t.id
     WHERE i.id = $1`,
    [inspectionId]
  );

  if (inspectionResult.rows.length === 0) {
    res.status(404);
    throw new Error('Inspection not found');
  }

  const inspection = inspectionResult.rows[0];

  // Get findings
  const findingsResult = await db.query(
    'SELECT * FROM inspection_findings WHERE inspection_id = $1 ORDER BY severity DESC, category',
    [inspectionId]
  );

  // Get repair request if exists
  const repairRequestResult = await db.query(
    `SELECT rr.*, 
            json_agg(
              json_build_object(
                'id', ir.id,
                'repair_description', ir.repair_description,
                'priority', ir.priority,
                'requested_action', ir.requested_action,
                'seller_response', ir.seller_response,
                'counter_offer', ir.counter_offer,
                'finding', json_build_object(
                  'id', f.id,
                  'category', f.category,
                  'severity', f.severity,
                  'description', f.description
                )
              )
            ) as requested_repairs
     FROM repair_requests rr
     LEFT JOIN requested_repairs ir ON rr.id = ir.repair_request_id
     LEFT JOIN inspection_findings f ON ir.finding_id = f.id
     WHERE rr.inspection_id = $1
     GROUP BY rr.id`,
    [inspectionId]
  );

  res.json({
    ...inspection,
    findings: findingsResult.rows,
    repairRequest: repairRequestResult.rows[0] || null
  });
});

// @desc    Upload inspection report
// @route   PUT /api/inspections/:id/report
// @access  Private
const uploadReport = asyncHandler(async (req, res) => {
  const inspectionId = req.params.userId;

  if (!req.file) {
    res.status(400);
    throw new Error('No report file uploaded');
  }

  const reportUrl = `/uploads/reports/${req.file.filename}`;

  const result = await db.query(
    `UPDATE inspections 
     SET report_url = $1, status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [reportUrl, inspectionId]
  );

  res.json(result.rows[0]);
});

// @desc    Create repair request
// @route   POST /api/inspections/:id/repair-request
// @access  Private
const createRepairRequest = asyncHandler(async (req, res) => {
  const inspectionId = req.params.userId;
  const { buyerNotes, requestedRepairs, deadlineDate } = req.body;

  // Start transaction
  await db.query('BEGIN');

  try {
    // Create repair request
    const repairRequestResult = await db.query(
      `INSERT INTO repair_requests (inspection_id, buyer_notes, deadline_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [inspectionId, buyerNotes, deadlineDate]
    );

    const repairRequest = repairRequestResult.rows[0];

    // Add requested repairs
    for (const repair of requestedRepairs) {
      await db.query(
        `INSERT INTO requested_repairs (repair_request_id, finding_id, repair_description, priority, requested_action)
         VALUES ($1, $2, $3, $4, $5)`,
        [repairRequest.id, repair.findingId, repair.repairDescription, repair.priority, repair.requestedAction]
      );
    }

    await db.query('COMMIT');

    // Fetch complete repair request with repairs
    const completeRequest = await db.query(
      `SELECT rr.*, 
              json_agg(
                json_build_object(
                  'id', ir.id,
                  'repair_description', ir.repair_description,
                  'priority', ir.priority,
                  'requested_action', ir.requested_action,
                  'finding', json_build_object(
                    'id', f.id,
                    'category', f.category,
                    'severity', f.severity
                  )
                )
              ) as requested_repairs
       FROM repair_requests rr
       LEFT JOIN requested_repairs ir ON rr.id = ir.repair_request_id
       LEFT JOIN inspection_findings f ON ir.finding_id = f.id
       WHERE rr.id = $1
       GROUP BY rr.id`,
      [repairRequest.id]
    );

    res.status(201).json(completeRequest.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
});


const updateRepairRequest = asyncHandler(async (req, res) => {
  const repairRequestId = req.params.userId;
  const {
    status,
    sellerResponse,
    negotiatedTerms,
    repairResponses // Array of { repairId, sellerResponse, counterOffer }
  } = req.body;

  const userId = req.user.id;

  // Start transaction
  await db.query('BEGIN');

  try {
    // Verify user has access to this repair request (either buyer or seller of the transaction)
    const repairRequestCheck = await db.query(
      `SELECT rr.*, t.buyer_id, t.seller_id, t.seller_id 
       FROM repair_requests rr
       JOIN inspections i ON rr.inspection_id = i.id
       JOIN transactions t ON i.transaction_id = t.id
       WHERE rr.id = $1 AND (t.buyer_id = $2 OR t.seller_id = $2 OR t.seller_id = $2)`,
      [repairRequestId, userId]
    );

    if (repairRequestCheck.rows.length === 0) {
      res.status(404);
      throw new Error('Repair request not found or access denied');
    }

    const repairRequest = repairRequestCheck.rows[0];
    const isSeller = repairRequest.seller_id === userId;
    const isBuyer = repairRequest.buyer_id === userId;

    // Build update query dynamically based on provided fields
    let updateFields = [];
    let updateValues = [];
    let paramCount = 1;

    if (status) {
      // Validate status transition
      const validStatuses = ['pending', 'accepted', 'rejected', 'negotiated', 'completed'];
      if (!validStatuses.includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
      }
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
      paramCount++;
    }

    if (sellerResponse && isSeller) {
      updateFields.push(`seller_response = $${paramCount}`);
      updateValues.push(sellerResponse);
      paramCount++;
    }

    if (negotiatedTerms) {
      updateFields.push(`negotiated_terms = $${paramCount}`);
      updateValues.push(negotiatedTerms);
      paramCount++;
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length > 0) {
      updateValues.push(repairRequestId);
      const updateQuery = `
        UPDATE repair_requests 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(updateQuery, updateValues);
    }

    // Update individual repair responses if provided
    if (repairResponses && Array.isArray(repairResponses)) {
      for (const repairResponse of repairResponses) {
        const { repairId, sellerResponse, counterOffer } = repairResponse;

        // Verify this repair belongs to the repair request
        const repairCheck = await db.query(
          'SELECT * FROM requested_repairs WHERE id = $1 AND repair_request_id = $2',
          [repairId, repairRequestId]
        );

        if (repairCheck.rows.length === 0) {
          continue; // Skip if repair doesn't belong to this request
        }

        let repairUpdateFields = [];
        let repairUpdateValues = [];
        let repairParamCount = 1;

        if (sellerResponse) {
          const validResponses = ['accept', 'reject', 'counter'];
          if (!validResponses.includes(sellerResponse)) {
            continue; // Skip invalid response
          }
          repairUpdateFields.push(`seller_response = $${repairParamCount}`);
          repairUpdateValues.push(sellerResponse);
          repairParamCount++;
        }

        if (counterOffer) {
          repairUpdateFields.push(`counter_offer = $${repairParamCount}`);
          repairUpdateValues.push(counterOffer);
          repairParamCount++;
        }

        if (repairUpdateFields.length > 0) {
          repairUpdateValues.push(repairId);
          const repairUpdateQuery = `
            UPDATE requested_repairs 
            SET ${repairUpdateFields.join(', ')}
            WHERE id = $${repairParamCount}
          `;
          await db.query(repairUpdateQuery, repairUpdateValues);
        }
      }
    }

    await db.query('COMMIT');

    // Fetch the updated repair request with all relations
    const updatedRequest = await db.query(
      `SELECT rr.*, 
              json_agg(
                json_build_object(
                  'id', ir.id,
                  'repair_description', ir.repair_description,
                  'priority', ir.priority,
                  'requested_action', ir.requested_action,
                  'seller_response', ir.seller_response,
                  'counter_offer', ir.counter_offer,
                  'finding', json_build_object(
                    'id', f.id,
                    'category', f.category,
                    'severity', f.severity,
                    'description', f.description
                  )
                )
              ) as requested_repairs
       FROM repair_requests rr
       LEFT JOIN requested_repairs ir ON rr.id = ir.repair_request_id
       LEFT JOIN inspection_findings f ON ir.finding_id = f.id
       WHERE rr.id = $1
       GROUP BY rr.id`,
      [repairRequestId]
    );

    res.json(updatedRequest.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
});

// @desc    Get inspections for a transaction
// @route   GET /api/inspections/transaction/:transactionId
// @access  Private
const getTransactionInspections = asyncHandler(async (req, res) => {
  const transactionId = req.params.transactionId;
  const userId = req.user.id;

  // Verify user has access to transaction
  const transactionCheck = await db.query(
    'SELECT * FROM transactions WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR seller_id = $2)',
    [transactionId, userId]
  );

  if (transactionCheck.rows.length === 0) {
    res.status(404);
    throw new Error('Transaction not found or access denied');
  }

  const inspectionsResult = await db.query(
    `SELECT i.*, ins.name as inspector_name, ins.company,
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'id', f.id,
                  'category', f.category,
                  'severity', f.severity,
                  'description', f.description
                )
              ) FILTER (WHERE f.id IS NOT NULL),
              '[]'
            ) as findings,
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'id', rr.id,
                  'status', rr.status,
                  'created_at', rr.created_at
                )
              ) FILTER (WHERE rr.id IS NOT NULL),
              '[]'
            ) as repair_requests
     FROM inspections i
     LEFT JOIN inspectors ins ON i.inspector_id = ins.id
     LEFT JOIN inspection_findings f ON i.id = f.inspection_id
     LEFT JOIN repair_requests rr ON i.id = rr.inspection_id
     WHERE i.transaction_id = $1
     GROUP BY i.id, ins.name, ins.company
     ORDER BY i.created_at DESC`,
    [transactionId]
  );

  res.json(inspectionsResult.rows);
});

module.exports = {
  getInspectors,
  scheduleInspection,
  getInspection,
  uploadReport,
  createRepairRequest,
  updateRepairRequest,
  getTransactionInspections
};