const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// const app = express();
// const PORT = 3001;
const router = express.Router();
// Middleware
// app.use(cors());
// app.use(express.json());

const ApplicationModel = require('../models/applicationModel');
const { authenticateToken } = require('../middleware/auth');
// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = crypto.randomBytes(8).toString('hex');
    const userDir = path.join(uploadsDir, userId);
    await fs.mkdir(userDir, { recursive: true });
    req.userDir = userDir;
    req.userId = userId;
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10
  }
});

// Configure email transporter (example with Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Virus scanning simulation (in production, integrate with ClamAV or similar)
async function scanForViruses(filePath) {
  // Simulate virus scan delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // In production, integrate with antivirus software
  // Example: const result = await clamav.scanFile(filePath);

  return { clean: true, threats: [] };
}

// Extract key information from documents (simplified version)
async function extractDocumentInfo(files) {
  const extractedData = {
    payStubs: [],
    bankStatements: [],
    taxReturns: [],
    driverLicense: []
  };

  // In production, use OCR libraries like Tesseract.js or cloud services
  // For now, just store file metadata
  Object.keys(files).forEach(docType => {
    if (files[docType]) {
      extractedData[docType] = files[docType].map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        uploadDate: new Date().toISOString()
      }));
    }
  });

  return extractedData;
}
// Create financial profile
function createFinancialProfile(formData, extractedData, userId) {
  const profile = {
    userId: userId,
    submissionDate: new Date().toISOString(),
    status: 'pending_review',
    financialInfo: {
      annualIncome: parseFloat(formData.annualIncome),
      monthlyDebt: parseFloat(formData.monthlyDebt),
      downPayment: parseFloat(formData.downPayment),
      debtToIncomeRatio: (parseFloat(formData.monthlyDebt) * 12) / parseFloat(formData.annualIncome)
    },
    documents: extractedData,
    nextStep: 'credit_check'
  };

  return profile;
}

// Send confirmation email
async function sendConfirmationEmail(email, userId) {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@preapproval.com',
    to: email,
    subject: 'Financial Documents Received - Pre-Approval Process',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Documents Received Successfully!</h2>
        <p>Thank you for submitting your financial documents for pre-approval.</p>
        <p><strong>Application ID:</strong> ${userId}</p>
        <p>We are currently reviewing your documents and will notify you once the verification is complete.</p>
        <h3>Next Steps:</h3>
        <ol>
          <li>Document verification (1-2 business days)</li>
          <li>Credit check authorization</li>
          <li>Pre-approval decision</li>
        </ol>
        <p>If you have any questions, please contact us at support@preapproval.com</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', email);
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error - email failure shouldn't stop the process
  }
}


// Generate application number
function generateApplicationNumber() {
  const prefix = 'APP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Map document type
function mapDocumentType(fieldName) {
  const typeMap = {
    'payStubs': 'pay_stub',
    'bankStatements': 'bank_statement',
    'taxReturns': 'tax_return',
    'driverLicense': 'driver_license'
  };
  return typeMap[fieldName] || 'other';
}

router.get('/all', async (req, res) => {
  const data = await ApplicationModel.getApplications();

  //console.log("all application ", data);
  res.json(data);
});



// Main endpoint for submitting financial information
router.post('/submit-financial-info', authenticateToken,

  upload.fields([
    { name: 'payStubs', maxCount: 2 },
    { name: 'bankStatements', maxCount: 2 },
    { name: 'taxReturns', maxCount: 2 },
    { name: 'driverLicense', maxCount: 2 }
  ]),

  async (req, res) => {
    try {
      const { annualIncome, monthlyDebt, downPayment, offerId} = req.body;

      const { email, first_name, phone, last_name } = req.user;

      // Validate required fields
      if (!annualIncome || !monthlyDebt || !downPayment) {
        return res.status(400).json({
          success: false,
          message: 'Missing required financial information or email'
        });
      }

      // Check documents
      const requiredDocs = ['payStubs', 'bankStatements', 'taxReturns', 'driverLicense'];
      const missingDocs = requiredDocs.filter(doc => !req.files[doc] || req.files[doc].length === 0);

      if (missingDocs.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required documents: ${missingDocs.join(', ')}`
        });
      }

      // Scan files for viruses
      const allFiles = Object.values(req.files).flat();
      for (const file of allFiles) {
        const scanResult = await scanForViruses(file.path);
        if (!scanResult.clean) {
          await fs.unlink(file.path);
          return res.status(400).json({
            success: false,
            message: 'File rejected: Security threat detected'
          });
        }
      }

      // Generate application number
      const applicationNumber = generateApplicationNumber();

      // Prepare documents data
      const documentsData = [];
      for (const [fieldName, files] of Object.entries(req.files)) {
        for (const file of files) {
          documentsData.push({
            documentType: mapDocumentType(fieldName),
            originalFilename: file.originalname,
            storedFilename: file.filename,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            isVirusScanned: true
          });
        }
      }

      // Email body for notification
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Documents Received Successfully!</h2>
          <p>Thank you for submitting your financial documents.</p>
          <p><strong>Application Number:</strong> ${applicationNumber}</p>
        </div>
      `;

      // Save to database using transaction
      const submissionResult = await ApplicationModel.completeSubmission({
        userId: req.user.userId,
        email: email || 'user@example.com',
        firstName: first_name || 'User',
        lastName: last_name || 'Name',
        phone: phone || null,
        applicationNumber,
        annualIncome: parseFloat(annualIncome),
        monthlyDebt: parseFloat(monthlyDebt),
        downPayment: parseFloat(downPayment),
        documents: documentsData,
        emailBody
      });

      // Send confirmation email
      // const emailSent = await sendConfirmationEmail(
      //   email || 'user@example.com',
      //   applicationNumber,
      //   submissionResult.application.id
      // );

      // // Update email notification status
      // if (emailSent) {
      //   const emailNotification = await ApplicationModel.query(
      //     'SELECT id FROM email_notifications WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1',
      //     [submissionResult.application.id]
      //   );
      //   if (emailNotification.rows.length > 0) {
      //     await ApplicationModel.markEmailAsSent(emailNotification.rows[0].id);
      //   }
      // }

      // Create audit log
      await ApplicationModel.createAuditLog({
        tableName: 'financial_applications',
        recordId: submissionResult.application.id,
        action: 'CREATE',
        oldData: null,
        newData: submissionResult.application,
        userId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });



          await pool.query(
                  `UPDATE task_value 
                             SET status = 'completed' 
                             WHERE task_id = $1 AND transactions_id = $2`,
                  [1, offerId]
              ); // done esign

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Documents uploaded and verified successfully',
        data: {
          applicationId: submissionResult.application.id,
          applicationNumber: applicationNumber,
          status: submissionResult.application.status,
          nextStep: 'credit_check',
          submissionDate: submissionResult.application.submitted_at,
          documentsUploaded: submissionResult.documents.length
        }
      });

    } catch (error) {
      console.error('Error processing submission:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while processing your submission',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);


// Endpoint to check application status
router.get('/application-status/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const profilePath = path.join(uploadsDir, applicationId, 'profile.json');

    const profileData = await fs.readFile(profilePath, 'utf8');
    const profile = JSON.parse(profileData);

    res.status(200).json({
      success: true,
      data: {
        applicationId: profile.userId,
        status: profile.status,
        submissionDate: profile.submissionDate,
        nextStep: profile.nextStep
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Application not found'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/statistics', async (req, res) => {
  try {
    const data = ApplicationModel.statics();
    res.json(data);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});


router.get('/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    //  res.status(200).json({
    //   success: true,
    //   data: applicationId
    // });

    const application = await ApplicationModel.getApplicationById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application details'
    });
  }
});



router.post('/:id/credit-check', async (req, res) => {
  const pool = await pool.connect();

  try {
    await pool.query('BEGIN');

    const { id } = req.params;

    // Insert credit check request
    const creditQuery = `
      INSERT INTO credit_check_requests 
      (application_id, request_status) 
      VALUES ($1, 'pending') 
      RETURNING *
    `;
    const creditResult = await pool.query(creditQuery, [id]);

    // Update application next step
    await pool.query(
      `UPDATE financial_applications 
       SET next_step = 'awaiting_credit_results', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    await pool.query('COMMIT');

    res.json({
      message: 'Credit check requested successfully',
      creditCheck: creditResult.rows[0]
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error requesting credit check:', error);
    res.status(500).json({ error: 'Failed to request credit check' });
  } finally {
    pool.release();
  }
});

// Bulk update applications
router.patch('/bulk/status', async (req, res) => {
  const pool = await pool.connect();

  try {
    await pool.query('BEGIN');

    const { applicationIds, status, changedBy, notes } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid application IDs' });
    }

    // Update applications
    const updateQuery = `
      UPDATE financial_applications 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ANY($2) 
      RETURNING id
    `;
    const updateResult = await pool.query(updateQuery, [status, applicationIds]);

    // Insert status history for each application
    for (const row of updateResult.rows) {
      await pool.query(
        `INSERT INTO application_status_history 
         (application_id, new_status, changed_by, notes) 
         VALUES ($1, $2, $3, $4)`,
        [row.id, status, changedBy, notes]
      );
    }

    await pool.query('COMMIT');

    res.json({
      message: 'Applications updated successfully',
      updatedCount: updateResult.rows.length
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error bulk updating applications:', error);
    res.status(500).json({ error: 'Failed to bulk update applications' });
  } finally {
    pool.release();
  }
});

// Get audit logs for an application
router.get('/:id/audit-logs', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM audit_logs 
      WHERE table_name = 'financial_applications' 
      AND record_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [id]);

    res.json({ auditLogs: result.rows });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.patch('/:id/status', async (req, res) => {

 // const pool = await pool.connect();

  try {
    await pool.query('BEGIN');

    const { id } = req.params;
    const { status, notes, changedBy, approvedAmount, rejectionReason } = req.body;

    // Get current status
    const currentResult = await pool.query(
      'SELECT status FROM financial_applications WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }

    const previousStatus = currentResult.rows[0].status;

    // Update application
    let updateQuery = `
      UPDATE financial_applications 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const params = [status];
    let paramCount = 2;

    if (status === 'approved') {
      updateQuery += `, approved_at = CURRENT_TIMESTAMP, approved_amount = $${paramCount}`;
      params.push(approvedAmount);
      paramCount++;
    } else if (status === 'rejected') {
      updateQuery += `, rejected_at = CURRENT_TIMESTAMP, rejection_reason = $${paramCount}`;
      params.push(rejectionReason);
      paramCount++;
    } else if (status === 'under_review') {
      updateQuery += `, reviewed_at = CURRENT_TIMESTAMP`;
    }

    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const updateResult = await pool.query(updateQuery, params);

    // Insert status history
    await pool.query(
      `INSERT INTO application_status_history 
       (application_id, previous_status, new_status, changed_by, notes) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, previousStatus, status, changedBy, notes]
    );

    // Create email notification
    const application = updateResult.rows[0];
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [application.user_id]
    );

    if (userResult.rows.length > 0) {
      const subject = `Application ${application.application_number} - Status Update`;
      const body = `Your application status has been updated to: ${status}`;

      await pool.query(
        `INSERT INTO email_notifications 
         (application_id, recipient_email, subject, body) 
         VALUES ($1, $2, $3, $4)`,
        [id, userResult.rows[0].email, subject, body]
      );
    }

    await pool.query('COMMIT');

    res.json({
      message: 'Application status updated successfully',
      application: updateResult.rows[0]
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  } finally {
   // pool.release();
  }
});






// Error handling middleware
// app.use((error, req, res, next) => {
//   if (error instanceof multer.MulterError) {
//     if (error.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({
//         success: false,
//         message: 'File size exceeds 10MB limit'
//       });
//     }
//     if (error.code === 'LIMIT_FILE_COUNT') {
//       return res.status(400).json({
//         success: false,
//         message: 'Too many files uploaded'
//       });
//     }
//   }

//   res.status(500).json({
//     success: false,
//     message: error.message || 'Internal server error'
//   });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`Financial upload server running on http://localhost:${PORT}`);
//   console.log(`Upload directory: ${uploadsDir}`);
// });

module.exports = router;