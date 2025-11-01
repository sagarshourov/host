// models/applicationModel.js
const { query, transaction } = require('../config/database');

class ApplicationModel {


  static async getApplications(req) {
    try {

      const page = 1;
      const limit = 10;
      const status = '';
      const search = '';
      const sortBy = 'submitted_at';
      const sortOrder = 'DESC';


      const offset = (page - 1) * limit;
      let q = `
      SELECT 
        fa.*,
        u.email as user_email,
        u.first_name as user_name,
        COUNT(fd.id) as document_count
      FROM financial_applications fa
      LEFT JOIN users u ON fa.user_id = u.id
      LEFT JOIN financial_documents fd ON fa.id = fd.application_id
      WHERE 1=1
    `;

      const params = [];
      let paramCount = 1;

      // Add status filter
      if (status) {
        q += ` AND fa.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      // Add search filter (application number or user details)
      if (search) {
        q += ` AND (fa.application_number ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      q += ` GROUP BY fa.id, u.email, u.first_name`;
      q += ` ORDER BY fa.${sortBy} ${sortOrder}`;
      q += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

// console.log(q);
//       return null;

      const result = await query(q, params);

      // Get total count for pagination
      let countQuery = `
      SELECT COUNT(DISTINCT fa.id) 
      FROM financial_applications fa
      LEFT JOIN users u ON fa.user_id = u.id
      WHERE 1=1
    `;
      const countParams = [];
      let countParamCount = 1;

      if (status) {
        countQuery += ` AND fa.status = $${countParamCount}`;
        countParams.push(status);
        countParamCount++;
      }

      if (search) {
        countQuery += ` AND (fa.application_number ILIKE $${countParamCount} OR u.email ILIKE $${countParamCount} OR u.first_name ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      return ({
        applications: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }

  }




  // Create financial application
  static async createApplication(applicationData) {
    const {
      userId,
      applicationNumber,
      annualIncome,
      monthlyDebt,
      downPayment
    } = applicationData;

    const sql = `
      INSERT INTO financial_applications (
        user_id,
        application_number,
        annual_income,
        monthly_debt,
        down_payment,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'pending_review')
      RETURNING *
    `;

    const result = await query(sql, [
      userId,
      applicationNumber,
      annualIncome,
      monthlyDebt,
      downPayment
    ]);

    return result.rows[0];
  }

  // Save document information
  static async saveDocument(documentData) {
    const {
      applicationId,
      documentType,
      originalFilename,
      storedFilename,
      filePath,
      fileSize,
      mimeType
    } = documentData;

    const sql = `
      INSERT INTO documents (
        application_id,
        document_type,
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      applicationId,
      documentType,
      originalFilename,
      storedFilename,
      filePath,
      fileSize,
      mimeType
    ]);

    return result.rows[0];
  }

  // Update document verification status
  static async updateDocumentVerification(documentId, scanResult) {
    const sql = `
      UPDATE documents
      SET is_virus_scanned = true,
          virus_scan_result = $2,
          verified_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [documentId, scanResult]);
    return result.rows[0];
  }

  // Get application by ID
  static async getApplicationById(applicationId) {
    const sql = `
      SELECT 
        a.*,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        json_agg(
          json_build_object(
            'id', d.id,
            'document_type', d.document_type,
            'original_filename', d.original_filename,
            'file_size', d.file_size,
            'uploaded_at', d.uploaded_at,
            'is_verified', d.is_verified
          )
        ) FILTER (WHERE d.id IS NOT NULL) as documents
      FROM financial_applications a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN financial_documents d ON a.id = d.application_id
      WHERE a.id = $1
      GROUP BY a.id, u.email, u.first_name, u.last_name, u.phone
    `;

    const result = await query(sql, [applicationId]);
    return result.rows[0];
  }

  // Get application by application number
  static async getApplicationByNumber(applicationNumber) {
    const sql = `
      SELECT 
        a.*,
        u.email,
        u.first_name,
        u.last_name,
        u.phone
      FROM financial_applications a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.application_number = $1
    `;

    const result = await query(sql, [applicationNumber]);
    return result.rows[0];
  }

  // Update application status
  static async updateApplicationStatus(applicationId, status, notes = null) {
    const sql = `
      UPDATE financial_applications
      SET status = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [applicationId, status]);
    return result.rows[0];
  }

  // Create email notification record
  static async createEmailNotification(emailData) {
    const { applicationId, recipientEmail, subject, body } = emailData;

    const sql = `
      INSERT INTO email_notifications (
        application_id,
        recipient_email,
        subject,
        body
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await query(sql, [
      applicationId,
      recipientEmail,
      subject,
      body
    ]);

    return result.rows[0];
  }

  // Mark email as sent
  static async markEmailAsSent(emailId) {
    const sql = `
      UPDATE email_notifications
      SET sent = true,
          sent_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [emailId]);
    return result.rows[0];
  }

  // Create credit check request
  static async createCreditCheckRequest(applicationId) {
    const sql = `
      INSERT INTO credit_check_requests (
        application_id,
        request_status
      ) VALUES ($1, 'pending')
      RETURNING *
    `;

    const result = await query(sql, [applicationId]);
    return result.rows[0];
  }

  // Get all documents for an application
  static async getDocumentsByApplicationId(applicationId) {
    const sql = `
      SELECT * FROM documents
      WHERE application_id = $1
      ORDER BY uploaded_at DESC
    `;

    const result = await query(sql, [applicationId]);
    return result.rows;
  }

  // Get application status history
  static async getStatusHistory(applicationId) {
    const sql = `
      SELECT * FROM application_status_history
      WHERE application_id = $1
      ORDER BY created_at DESC
    `;

    const result = await query(sql, [applicationId]);
    return result.rows;
  }

  // Complete submission with transaction
  static async completeSubmission(submissionData) {
    return await transaction(async (client) => {
      // Create or update user
      // const userSql = `
      //   INSERT INTO users (email, first_name, last_name, phone)
      //   VALUES ($1, $2, $3, $4)
      //   ON CONFLICT (email) 
      //   DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      //   RETURNING *
      // `;
      // const userResult = await client.query(userSql, [
      //   submissionData.email,
      //   submissionData.firstName,
      //   submissionData.lastName,
      //   submissionData.phone
      // ]);
      // const user = userResult.rows[0];

      // Create application
      const appSql = `
        INSERT INTO financial_applications (
          user_id,
          application_number,
          annual_income,
          monthly_debt,
          down_payment,
          status
        ) VALUES ($1, $2, $3, $4, $5, 'pending_review')
        RETURNING *
      `;
      const appResult = await client.query(appSql, [
        submissionData.userId,
        submissionData.applicationNumber,
        submissionData.annualIncome,
        submissionData.monthlyDebt,
        submissionData.downPayment
      ]);
      const application = appResult.rows[0];

      // Save all documents
      const documents = [];
      for (const doc of submissionData.documents) {
        const docSql = `
          INSERT INTO financial_documents (
            application_id,
            document_type,
            original_filename,
            stored_filename,
            file_path,
            file_size,
            mime_type,
            is_virus_scanned
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        const docResult = await client.query(docSql, [
          application.id,
          doc.documentType,
          doc.originalFilename,
          doc.storedFilename,
          doc.filePath,
          doc.fileSize,
          doc.mimeType,
          doc.isVirusScanned
        ]);
        documents.push(docResult.rows[0]);
      }

      // Create email notification
      const emailSql = `
        INSERT INTO email_notifications (
          application_id,
          recipient_email,
          subject,
          body
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      await client.query(emailSql, [
        application.id,
        submissionData.email,
        'Financial Documents Received - Pre-Approval Process',
        submissionData.emailBody
      ]);

      // Create credit check request
      const creditSql = `
        INSERT INTO credit_check_requests (
          application_id,
          request_status
        ) VALUES ($1, 'pending')
        RETURNING *
      `;
      await client.query(creditSql, [application.id]);

      return {
        application,
        documents
      };
    });
  }

  // Create audit log
  static async createAuditLog(auditData) {
    const { tableName, recordId, action, oldData, newData, userId, ipAddress, userAgent } = auditData;

    const sql = `
      INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await query(sql, [
      tableName,
      recordId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      userId,
      ipAddress,
      userAgent
    ]);

    return result.rows[0];
  }


  static async statics() {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending,
        COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        AVG(approved_amount) FILTER (WHERE status = 'approved') as avg_approved_amount,
        SUM(approved_amount) FILTER (WHERE status = 'approved') as total_approved_amount,
        AVG(credit_score) as avg_credit_score
      FROM financial_applications
    `;

    const result = await query(statsQuery);
    return result.rows[0];
  }




}

module.exports = ApplicationModel;