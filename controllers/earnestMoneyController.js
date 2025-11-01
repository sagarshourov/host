// earnestMoneyController.js

const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { validatePhoneNumber } = require('../utils/validation');
//const { sendSecurityAlert } = require('./utils/notifications');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/wire-confirmations');
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, `wire-confirmation-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
        }
    }
});

class EarnestMoneyController {
    constructor(pool) {
        this.pool = pool;
    }

    // Get wire instructions for a transaction
    async getWireInstructions(req, res) {
        const { transactionId } = req.params;
        const userId = req.user.userId;

        try {
            // Log the access attempt
            await this.logAuditEvent(null, userId, 'VIEW_WIRE_INSTRUCTIONS', {
                transactionId,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            // Get wire instructions with title company details
            const result = await this.pool.query(`
                SELECT 
                    wi.*,
                    tc.name as title_company_name,
                    tc.phone as title_company_phone,
                    tc.email as title_company_email,
                    tc.address as title_company_address,
                    tc.is_verified as title_company_verified
                FROM wire_instructions wi
                JOIN title_companies tc ON wi.title_company_id = tc.id
                WHERE wi.transaction_id = $1
                AND wi.expires_at > NOW()
                ORDER BY wi.created_at DESC
                LIMIT 1
            `, [transactionId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No active wire instructions found for this transaction'
                });
            }

            // Mask sensitive information for security
            const wireInstructions = result.rows[0];
            wireInstructions.account_number = this.maskAccountNumber(wireInstructions.account_number);

            res.json({
                success: true,
                data: {
                    wireInstructions,
                    securityWarnings: [
                        'ALWAYS verify wire instructions by calling the title company directly',
                        'Use the phone number from an independent source, not from email',
                        'Never trust wire instructions received via email without verification',
                        'Be aware of last-minute changes to wire instructions - this is a common fraud tactic',
                        'If something seems suspicious, STOP and verify before sending any funds'
                    ]
                }
            });
        } catch (error) {
            console.error('Error fetching wire instructions:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching wire instructions'
            });
        }
    }

    // Initiate earnest money deposit
    async initiateDeposit(req, res) {
        const {
            transactionId,
            wireInstructionId,
            amount,
            propertyId,
            phoneVerified
        } = req.body;
        const buyerId = req.user.userId;

        try {
            await this.pool.query('BEGIN');

            // Verify the wire instructions are valid and not expired
            const wireCheck = await this.pool.query(`
                SELECT * FROM wire_instructions 
                WHERE id = $1 AND transaction_id = $2 AND expires_at > NOW()
            `, [wireInstructionId, transactionId]);

            if (wireCheck.rows.length === 0) {
                await this.pool.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired wire instructions'
                });
            }

            // Create earnest money deposit record
            const depositResult = await this.pool.query(`
                INSERT INTO earnest_money_deposits (
                    transaction_id,
                    buyer_id,
                    property_id,
                    wire_instruction_id,
                    amount,
                    status,
                    phone_verification_completed,
                    phone_verification_timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                transactionId,
                buyerId,
                propertyId,
                wireInstructionId,
                amount,
                'initiated',
                phoneVerified,
                phoneVerified ? new Date() : null
            ]);

            const deposit = depositResult.rows[0];

            // Log the initiation
            await this.logAuditEvent(deposit.id, buyerId, 'INITIATE_DEPOSIT', {
                amount,
                phoneVerified
            });

            // Create fraud check record
            await this.pool.query(`
                INSERT INTO wire_fraud_checks (
                    deposit_id,
                    check_type,
                    check_status,
                    check_details
                ) VALUES ($1, $2, $3, $4)
            `, [
                deposit.id,
                'phone_verification',
                phoneVerified ? 'passed' : 'pending',
                { timestamp: new Date() }
            ]);

            await this.pool.query('COMMIT');

            res.json({
                success: true,
                data: {
                    depositId: deposit.id,
                    status: deposit.status,
                    message: 'Deposit initiated successfully. Please proceed with wire transfer.'
                }
            });
        } catch (error) {
            await this.pool.query('ROLLBACK');
            console.error('Error initiating deposit:', error);
            res.status(500).json({
                success: false,
                message: 'Error initiating deposit'
            });
        }
    }

    // Upload wire confirmation
    async uploadWireConfirmation(req, res) {
        const { depositId } = req.params;
        const { confirmationNumber } = req.body;
        const userId = req.user.userId;
        const file = req.file;

        try {
            await this.pool.query('BEGIN');

            // Verify the deposit belongs to the user
            const depositCheck = await this.pool.query(`
                SELECT * FROM earnest_money_deposits
                WHERE id = $1 AND buyer_id = $2
            `, [depositId, userId]);

            if (depositCheck.rows.length === 0) {
                await this.pool.query('ROLLBACK');
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access to this deposit'
                });
            }

            // Update deposit with confirmation details
            const fileUrl = file ? `/uploads/wire-confirmations/${file.filename}` : null;

            await this.pool.query(`
                UPDATE earnest_money_deposits
                SET 
                    wire_confirmation_number = $1,
                    wire_confirmation_document_url = $2,
                    status = 'confirmed_by_buyer',
                    updated_at = NOW()
                WHERE id = $3
            `, [confirmationNumber, fileUrl, depositId]);

            // Log the upload
            await this.logAuditEvent(depositId, userId, 'UPLOAD_CONFIRMATION', {
                confirmationNumber,
                hasDocument: !!file
            });

            // Notify title company of pending confirmation
            await this.notifyTitleCompany(depositId);

            await this.pool.query('COMMIT');

            res.json({
                success: true,
                data: {
                    message: 'Wire confirmation uploaded successfully',
                    status: 'confirmed_by_buyer',
                    nextStep: 'Waiting for title company confirmation'
                }
            });
        } catch (error) {
            await this.pool.query('ROLLBACK');
            console.error('Error uploading confirmation:', error);
            res.status(500).json({
                success: false,
                message: 'Error uploading wire confirmation'
            });
        }
    }

    // Verify phone number for fraud prevention
    async verifyPhoneNumber(req, res) {
        const { depositId, titleCompanyPhone } = req.body;
        const userId = req.user.userId;

        // res.status(200).json({
        //     success: false,
        //     message: userId
        // });

        try {
            // Get the expected phone number from the database
            const result = await this.pool.query(`
                SELECT 
                    emd.id,
                    tc.phone as expected_phone
                FROM earnest_money_deposits emd
                JOIN wire_instructions wi ON emd.wire_instruction_id = wi.id
                JOIN title_companies tc ON wi.title_company_id = tc.id
                WHERE emd.id = $1 AND emd.buyer_id = $2
            `, [depositId,userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Deposit not found'
                });
            }

            const expectedPhone = result.rows[0].expected_phone;
            const isValid = validatePhoneNumber(titleCompanyPhone, expectedPhone);

            if (isValid) {
                // Update verification status
                await this.pool.query(`
                    UPDATE earnest_money_deposits
                    SET 
                        phone_verification_completed = true,
                        phone_verification_timestamp = NOW()
                    WHERE id = $1
                `, [depositId]);

                // Log successful verification
                await this.pool.query(`
                    INSERT INTO wire_fraud_checks (
                        deposit_id,
                        check_type,
                        check_status,
                        check_details
                    ) VALUES ($1, $2, $3, $4)
                `, [
                    depositId,
                    'phone_verification',
                    'passed',
                    { verifiedAt: new Date() }
                ]);
            } else {
                // Log failed verification and alert
                await this.pool.query(`
                    INSERT INTO wire_fraud_checks (
                        deposit_id,
                        check_type,
                        check_status,
                        check_details
                    ) VALUES ($1, $2, $3, $4)
                `, [
                    depositId,
                    'phone_verification',
                    'failed',
                    {
                        providedPhone: titleCompanyPhone,
                        expectedPhone: expectedPhone,
                        failedAt: new Date()
                    }
                ]);

                // Send security alert
                // await sendSecurityAlert({
                //     type: 'PHONE_VERIFICATION_FAILED',
                //     depositId,
                //     userId,
                //     details: { providedPhone: titleCompanyPhone }
                // });
            }

            res.json({
                success: isValid,
                message: isValid
                    ? 'Phone number verified successfully'
                    : 'Phone number verification failed. Please contact support.'
            });
        } catch (error) {
            console.error('Error verifying phone number:', error);
            res.status(500).json({
                success: false,
                message: 'Error verifying phone number'
            });
        }
    }

    // Get deposit status
    async getDepositStatus(req, res) {
        const { depositId } = req.params;
        const userId = req.user.userId;

        try {
            const result = await this.pool.query(`
                SELECT 
                    emd.*,
                    tc.name as title_company_name,
                    tc.phone as title_company_phone,
                    (
                        SELECT json_agg(json_build_object(
                            'check_type', check_type,
                            'check_status', check_status,
                            'created_at', created_at
                        ) ORDER BY created_at DESC)
                        FROM wire_fraud_checks
                        WHERE deposit_id = emd.id
                    ) as fraud_checks
                FROM earnest_money_deposits emd
                JOIN wire_instructions wi ON emd.wire_instruction_id = wi.id
                JOIN title_companies tc ON wi.title_company_id = tc.id
                WHERE emd.id = $1 AND emd.buyer_id = $2
            `, [depositId, userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Deposit not found'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error fetching deposit status:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching deposit status'
            });
        }
    }

    // Title company confirmation endpoint (restricted access)
    async confirmDepositByTitleCompany(req, res) {
        const { depositId } = req.params;
        const { referenceNumber } = req.body;

        // This endpoint should have additional authentication for title companies
        // For now, assuming proper authentication middleware is in place

        try {
            await this.pool.query('BEGIN');

            // Update deposit status
            await this.pool.query(`
                UPDATE earnest_money_deposits
                SET 
                    status = 'completed',
                    title_company_confirmation = true,
                    title_company_confirmation_timestamp = NOW(),
                    title_company_reference = $1
                WHERE id = $2
            `, [referenceNumber, depositId]);

            // Log the confirmation
            await this.logAuditEvent(depositId, req.user.userId, 'TITLE_COMPANY_CONFIRMATION', {
                referenceNumber
            });

            await this.pool.query('COMMIT');

            res.json({
                success: true,
                message: 'Deposit confirmed successfully'
            });
        } catch (error) {
            await this.pool.query('ROLLBACK');
            console.error('Error confirming deposit:', error);
            res.status(500).json({
                success: false,
                message: 'Error confirming deposit'
            });
        }
    }

    // Helper methods
    maskAccountNumber(accountNumber) {
        if (!accountNumber || accountNumber.length < 4) return accountNumber;
        const lastFour = accountNumber.slice(-4);
        return '*'.repeat(accountNumber.length - 4) + lastFour;
    }

    async logAuditEvent(depositId, userId, action, details) {
        try {
            await this.pool.query(`
                INSERT INTO earnest_money_audit_log (
                    deposit_id,
                    user_id,
                    action,
                    details,
                    ip_address,
                    user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                depositId,
                userId,
                action,
                JSON.stringify(details),
                details.ip || null,
                details.userAgent || null
            ]);
        } catch (error) {
            console.error('Error logging audit event:', error);
        }
    }

    async notifyTitleCompany(depositId) {
        // Implementation for notifying title company
        // This could send an email, SMS, or use a webhook
        console.log(`Notifying title company about deposit ${depositId}`);
    }
}

module.exports = EarnestMoneyController;
