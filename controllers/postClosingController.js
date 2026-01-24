const db = require('../config/database');

const emailService = require('../services/emailService');

// Get all documents for a transaction
const getPostClosingDocuments = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT 
        pcd.*,
        t.property_address,
        t.closing_date,
        u.email as buyer_email,
        u.first_name || ' ' || u.last_name as buyer_name
      FROM post_closing_documents pcd
      LEFT JOIN transactions t ON pcd.transaction_id = t.id
      LEFT JOIN users u ON pcd.user_id = u.id
      WHERE pcd.transaction_id = $1 
        AND pcd.user_id = $2
        AND pcd.deleted_at IS NULL
      ORDER BY pcd.created_at DESC
    `;

    const result = await db.query(query, [transaction_id, userId]);
    
    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching post-closing documents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch documents' 
    });
  }
};

// Upload a new document
const uploadDocument = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { transaction_id } = req.params;
    const { document_type, metadata, county_recording_number } = req.body;
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    // Verify transaction exists and user has access
    const transactionQuery = `
      SELECT id, property_address, closing_date 
      FROM transactions 
      WHERE id = $1 
        AND (buyer_id = $2 OR seller_id = $2)
        AND status = 'closed'
    `;

    const transactionResult = await client.query(transactionQuery, [transaction_id, userId]);
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found or access denied' 
      });
    }

    // Determine recording status based on document type
    let recording_status = 'delivered';
    let recorded_date = null;
    
    if (document_type === 'recorded_deed' && county_recording_number) {
      recording_status = 'recorded';
      recorded_date = new Date();
    }

    // Insert document
    const insertQuery = `
      INSERT INTO post_closing_documents (
        transaction_id,
        user_id,
        document_type,
        file_name,
        file_url,
        file_size,
        recording_status,
        county_recording_number,
        recorded_date,
        metadata,
        is_delivered,
        delivered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      transaction_id,
      userId,
      document_type,
      file.originalname,
      file.path,
      file.size,
      recording_status,
      county_recording_number || null,
      recorded_date,
      metadata || {},
      true,
      new Date()
    ];

    const result = await client.query(insertQuery, values);
    
    await client.query('COMMIT');

    // Send notification
    if (req.user.email) {
      await emailService.sendDocumentUploadNotification({
        to: req.user.email,
        documentType: document_type,
        fileName: file.originalname,
        transactionId: transaction_id
      });
    }

    res.status(201).json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload document' 
    });
  } finally {
    client.release();
  }
};

// Update recording status for a document
const updateRecordingStatus = async (req, res) => {
  try {
    const { document_id } = req.params;
    const { 
      recording_status, 
      county_recording_number, 
      recorded_date,
      notes 
    } = req.body;
    const userId = req.user.id;

    // Check if user has permission to update this document
    const checkQuery = `
      SELECT pcd.*, t.property_address
      FROM post_closing_documents pcd
      JOIN transactions t ON pcd.transaction_id = t.id
      WHERE pcd.id = $1 
        AND (pcd.user_id = $2 OR t.buyer_id = $2 OR t.seller_id = $2)
        AND pcd.deleted_at IS NULL
    `;

    const checkResult = await db.query(checkQuery, [document_id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found or access denied' 
      });
    }

    const document = checkResult.rows[0];

    // Update document
    const updateQuery = `
      UPDATE post_closing_documents
      SET 
        recording_status = COALESCE($2, recording_status),
        county_recording_number = COALESCE($3, county_recording_number),
        recorded_date = COALESCE($4, recorded_date),
        metadata = COALESCE(metadata || $5, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const metadataUpdate = notes ? { notes, updated_by: userId } : {};
    
    const result = await db.query(updateQuery, [
      document_id,
      recording_status,
      county_recording_number,
      recorded_date,
      JSON.stringify(metadataUpdate)
    ]);

    // If status changed to recorded, send notification
    if (recording_status === 'recorded' && document.recording_status !== 'recorded') {
      const userQuery = `
        SELECT email FROM users 
        WHERE id = $1 OR id IN (
          SELECT buyer_id FROM transactions WHERE id = $2
        )
      `;
      
      const userResult = await db.query(userQuery, [userId, document.transaction_id]);
      
      if (userResult.rows.length > 0) {
        await emailService.sendRecordingCompleteNotification({
          to: userResult.rows[0].email,
          documentType: document.document_type,
          transactionId: document.transaction_id,
          propertyAddress: document.property_address,
          recordingNumber: county_recording_number
        });
      }
    }

    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating recording status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update status' 
    });
  }
};

// Get document statistics for a transaction
const getDocumentStats = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const userId = req.user.id;

    // Get document counts by type and status
    const statsQuery = `
      SELECT 
        document_type,
        recording_status,
        COUNT(*) as count
      FROM post_closing_documents
      WHERE transaction_id = $1 
        AND user_id = $2
        AND deleted_at IS NULL
      GROUP BY document_type, recording_status
      ORDER BY document_type, recording_status
    `;

    const statsResult = await db.query(statsQuery, [transaction_id, userId]);

    // Get pending recording count
    const pendingQuery = `
      SELECT COUNT(*) as pending_count
      FROM post_closing_documents
      WHERE transaction_id = $1 
        AND user_id = $2
        AND recording_status IN ('pending', 'submitted')
        AND deleted_at IS NULL
    `;

    const pendingResult = await db.query(pendingQuery, [transaction_id, userId]);

    // Get delivery status
    const deliveryQuery = `
      SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN is_delivered THEN 1 ELSE 0 END) as delivered_count
      FROM post_closing_documents
      WHERE transaction_id = $1 
        AND user_id = $2
        AND deleted_at IS NULL
    `;

    const deliveryResult = await db.query(deliveryQuery, [transaction_id, userId]);

    res.json({ 
      success: true, 
      data: {
        stats: statsResult.rows,
        pending_recording: parseInt(pendingResult.rows[0]?.pending_count || 0),
        total_documents: parseInt(deliveryResult.rows[0]?.total_documents || 0),
        delivered_documents: parseInt(deliveryResult.rows[0]?.delivered_count || 0),
        all_delivered: deliveryResult.rows[0]?.delivered_count === deliveryResult.rows[0]?.total_documents
      }
    });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch document statistics' 
    });
  }
};

// Delete a document (soft delete)
const deleteDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    const userId = req.user.id;

    // Soft delete document
    const deleteQuery = `
      UPDATE post_closing_documents
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING id, file_name
    `;

    const result = await db.query(deleteQuery, [document_id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found or access denied' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Document deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete document' 
    });
  }
};

// Download a document
const downloadDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT file_url, file_name
      FROM post_closing_documents
      WHERE id = $1 
        AND user_id = $2
        AND deleted_at IS NULL
    `;

    const result = await db.query(query, [document_id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }

    const { file_url, file_name } = result.rows[0];
    
    // Set headers for file download
    res.download(file_url, file_name, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to download file' 
        });
      }
    });
  } catch (error) {
    console.error('Error preparing download:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to prepare download' 
    });
  }
};

// Bulk update status for multiple documents
const bulkUpdateStatus = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { transaction_id } = req.params;
    const { updates } = req.body;
    const userId = req.user.id;

    // Verify transaction access
    const transactionQuery = `
      SELECT id FROM transactions 
      WHERE id = $1 
        AND (buyer_id = $2 OR seller_id = $2)
    `;

    const transactionResult = await client.query(transactionQuery, [transaction_id, userId]);
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction access denied' 
      });
    }

    const updatedDocuments = [];
    
    for (const update of updates) {
      const { document_id, recording_status, county_recording_number } = update;
      
      const updateQuery = `
        UPDATE post_closing_documents
        SET 
          recording_status = $3,
          county_recording_number = COALESCE($4, county_recording_number),
          recorded_date = CASE 
            WHEN $3 = 'recorded' THEN CURRENT_TIMESTAMP 
            ELSE recorded_date 
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
          AND transaction_id = $2
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        document_id,
        transaction_id,
        recording_status,
        county_recording_number
      ]);
      
      if (result.rows.length > 0) {
        updatedDocuments.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      data: updatedDocuments,
      message: `${updatedDocuments.length} document(s) updated successfully`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk update:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update documents' 
    });
  } finally {
    client.release();
  }
};

// Get document by ID
const getDocumentById = async (req, res) => {
  try {
    const { document_id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT pcd.*, t.property_address
      FROM post_closing_documents pcd
      JOIN transactions t ON pcd.transaction_id = t.id
      WHERE pcd.id = $1 
        AND (pcd.user_id = $2 OR t.buyer_id = $2 OR t.seller_id = $2)
        AND pcd.deleted_at IS NULL
    `;

    const result = await db.query(query, [document_id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }

    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch document' 
    });
  }
};

// Mark document as delivered
const markAsDelivered = async (req, res) => {
  try {
    const { document_id } = req.params;
    const userId = req.user.id;

    const query = `
      UPDATE post_closing_documents
      SET 
        is_delivered = TRUE,
        delivered_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, [document_id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }

    res.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Document marked as delivered'
    });
  } catch (error) {
    console.error('Error marking document as delivered:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update document' 
    });
  }
};

// Get documents by status
const getDocumentsByStatus = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const { status } = req.query;
    const userId = req.user.id;

    const query = `
      SELECT *
      FROM post_closing_documents
      WHERE transaction_id = $1 
        AND user_id = $2
        AND recording_status = $3
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [transaction_id, userId, status]);
    
    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching documents by status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch documents' 
    });
  }
};

// Export all functions
module.exports = {
  getPostClosingDocuments,
  uploadDocument,
  updateRecordingStatus,
  getDocumentStats,
  deleteDocument,
  downloadDocument,
  bulkUpdateStatus,
  getDocumentById,
  markAsDelivered,
  getDocumentsByStatus
};