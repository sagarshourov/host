const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // PostgreSQL connection pool
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// State-specific contract templates
const stateTemplates = {
    CA: {
        name: 'California Residential Purchase Agreement',
        sections: ['statutory_disclosures', 'earthquake_disclosure', 'natural_hazard'],
        attorneyReviewDays: 0
    },
    NY: {
        name: 'New York Contract of Sale',
        sections: ['lead_paint', 'coop_restrictions'],
        attorneyReviewDays: 3
    },
    TX: {
        name: 'Texas Real Estate Commission Contract',
        sections: ['property_condition', 'hoa_disclosure'],
        attorneyReviewDays: 0
    },
    FL: {
        name: 'Florida Residential Contract for Sale',
        sections: ['flood_zone', 'homestead_rights'],
        attorneyReviewDays: 0
    }
};

// Generate Contract Endpoint
router.post('/generate/:offerId', async (req, res) => {
    try {
        await pool.query('BEGIN');

        const { offerId } = req.params;

        // Fetch offer details with your actual table structure
        const offerQuery = `
      SELECT 
        t.*,o.*,
        -- Buyer info
        b.first_name as buyer_first_name,
        b.last_name as buyer_last_name,
        b.email as buyer_email,
        b.phone as buyer_phone,
        b.address as buyer_address,
        -- Seller info
        s.first_name as seller_first_name,
        s.last_name as seller_last_name,
        s.email as seller_email,
        s.phone as seller_phone,
        -- Property info (using your actual fields)
        p.street_address,
        p.city,
        p.state,
        p.zip_code,
        p.property_type,
        p.bedrooms,
        p.bathrooms,
        p.square_feet,
        p.year_built,
        p.lot_size,
        p.has_pool,
        p.has_fireplace,
        p.has_deck,
        p.has_basement,
        p.garage_spaces,
        p.description
      FROM transactions t
      JOIN users b ON t.buyer_id = b.id
      JOIN properties p ON t.property_id = p.id
      JOIN users s ON t.seller_id = s.id
      JOIN offers o ON t.offer_id = o.id
      WHERE t.id = $1 
    `;

        const offerResult = await pool.query(offerQuery, [offerId]);

        if (offerResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Accepted offer not found' });
        }

        const offer = offerResult.rows[0];



        // Build full property address from separate fields
        const fullPropertyAddress = `${offer.street_address}, ${offer.city}, ${offer.state} ${offer.zip_code}`;

        // Get state-specific template
        const template = stateTemplates[offer.state] || stateTemplates.CA;

        // Generate contract ID
        const contractId = `CNT-${Date.now()}-${offerId}`;

        // Calculate attorney review deadline
        const generatedDate = new Date();
        let attorneyReviewDeadline = null;
        if (template.attorneyReviewDays > 0) {
            attorneyReviewDeadline = new Date(generatedDate);
            attorneyReviewDeadline.setDate(attorneyReviewDeadline.getDate() + template.attorneyReviewDays);
        }

        // Calculate earnest money if not set (default 1% of offer amount)
        const earnestMoney = offer.earnest_money || (offer.offer_amount * 0.01);

        // Calculate down payment amount
        const downPaymentAmount = offer.down_payment_amount ||
            (offer.offer_amount * ((offer.down_payment_percent || 20) / 100));

        // Calculate loan amount
        const loanAmount = offer.loan_amount || (offer.offer_amount - downPaymentAmount);

        // Build inclusions array from property features
        const inclusions = [];
        inclusions.push("All fixtures and fittings currently attached to the property");
        if (offer.garage_spaces > 0) {
            inclusions.push(`Garage (${offer.garage_spaces} space${offer.garage_spaces > 1 ? 's' : ''})`);
        }
        if (offer.has_pool) {
            inclusions.push("Swimming pool and equipment");
        }
        if (offer.has_fireplace) {
            inclusions.push("Fireplace");
        }
        if (offer.has_deck) {
            inclusions.push("Deck");
        }
        if (offer.has_basement) {
            inclusions.push("Basement");
        }

        // Build property description for legal description
        const legalDescription = `${offer.property_type} property located at ${fullPropertyAddress}, ` +
            `consisting of ${offer.bedrooms} bedroom(s), ${offer.bathrooms} bathroom(s), ` +
            `approximately ${offer.square_feet} square feet` +
            (offer.lot_size ? `, on a lot of ${offer.lot_size} acres` : '') +
            (offer.year_built ? `, built in ${offer.year_built}` : '');

        // Prepare contract data
        const contractData = {
            contractId,
            buyer: {
                name: `${offer.buyer_first_name} ${offer.buyer_last_name}`,
                email: offer.buyer_email,
                phone: offer.buyer_phone || '',
                address: offer.buyer_address || ''
            },
            seller: {
                name: `${offer.seller_first_name} ${offer.seller_last_name}`,
                email: offer.seller_email,
                phone: offer.seller_phone || ''
            },
            property: {
                address: fullPropertyAddress,
                legalDescription: legalDescription,
                apn: '' // Not available in your schema
            },
            terms: {
                purchasePrice: parseFloat(offer.offer_amount),
                earnestMoney: parseFloat(earnestMoney),
                downPayment: parseFloat(downPaymentAmount),
                loanAmount: parseFloat(loanAmount),
                financingType: offer.financing_type || 'conventional',
                closingDate: offer.closing_date || '2026-01-12'
            },
            contingencies: offer.contingencies || [],
            inclusions: inclusions,
            exclusions: [], // Can be added later if needed
            specialProvisions: offer.special_provisions || [],
            template: template.name,
            attorneyReviewDays: template.attorneyReviewDays
        };

        // Generate PDF
        const pdfPath = await generateContractPDF(contractData);

        // Insert contract into database
        const existingContractQuery = `
            SELECT id, contract_id FROM contracts WHERE transactions_id = $1
            `;

        const existingContractResult = await pool.query(existingContractQuery, [offerId]);

        let contract;

        if (existingContractResult.rows.length > 0) {
            // Contract exists - UPDATE it
            console.log('Contract already exists, updating...');

            const existingContract = existingContractResult.rows[0];
            const oldContractId = existingContract.contract_id;

            const updateQuery = `
                    UPDATE contracts SET
                    template_name = $1,
                    buyer_name = $2,
                    buyer_email = $3,
                    buyer_phone = $4,
                    buyer_address = $5,
                    seller_name = $6,
                    seller_email = $7,
                    seller_phone = $8,
                    property_address = $9,
                    property_legal_description = $10,
                    property_apn = $11,
                    purchase_price = $12,
                    earnest_money = $13,
                    down_payment = $14,
                    loan_amount = $15,
                    financing_type = $16,
                    closing_date = $17,
                    contingencies = $18,
                    inclusions = $19,
                    exclusions = $20,
                    special_provisions = $21,
                    attorney_review_days = $22,
                    attorney_review_deadline = $23,
                    pdf_path = $24,
                    status = $25,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE transactions_id = $26
                    RETURNING *
                `;

            const contractResult = await pool.query(updateQuery, [
                template.name,
                contractData.buyer.name,
                contractData.buyer.email,
                contractData.buyer.phone,
                contractData.buyer.address,
                contractData.seller.name,
                contractData.seller.email,
                contractData.seller.phone,
                contractData.property.address,
                contractData.property.legalDescription,
                contractData.property.apn,
                contractData.terms.purchasePrice,
                contractData.terms.earnestMoney,
                contractData.terms.downPayment,
                contractData.terms.loanAmount,
                contractData.terms.financingType,
                contractData.terms.closingDate,
                JSON.stringify(contractData.contingencies),
                JSON.stringify(contractData.inclusions),
                JSON.stringify(contractData.exclusions),
                JSON.stringify(contractData.specialProvisions),
                template.attorneyReviewDays,
                attorneyReviewDeadline,
                pdfPath,
                'generated',
                offerId
            ]);

            contract = contractResult.rows[0];

            // Delete old PDF file if it exists
            const oldPdfPath = path.join(__dirname, '../uploads/contracts', `contract_${oldContractId}.pdf`);
            if (fs.existsSync(oldPdfPath)) {
                fs.unlinkSync(oldPdfPath);
                console.log('Old PDF deleted:', oldPdfPath);
            }

        } else {
            // Contract doesn't exist - INSERT new one
            console.log('Creating new contract...');

            const insertQuery = `
                        INSERT INTO contracts (
                        transactions_id, contract_id, template_name,
                        buyer_name, buyer_email, buyer_phone, buyer_address,
                        seller_name, seller_email, seller_phone,
                        property_address, property_legal_description, property_apn,
                        purchase_price, earnest_money, down_payment, loan_amount,
                        financing_type, closing_date,
                        contingencies, inclusions, exclusions, special_provisions,
                        attorney_review_days, attorney_review_deadline,
                        pdf_path, status
                        ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
                        ) RETURNING *
                    `;

            const contractResult = await pool.query(insertQuery, [
                offerId,
                contractId,
                template.name,
                contractData.buyer.name,
                contractData.buyer.email,
                contractData.buyer.phone,
                contractData.buyer.address,
                contractData.seller.name,
                contractData.seller.email,
                contractData.seller.phone,
                contractData.property.address,
                contractData.property.legalDescription,
                contractData.property.apn,
                contractData.terms.purchasePrice,
                contractData.terms.earnestMoney,
                contractData.terms.downPayment,
                contractData.terms.loanAmount,
                contractData.terms.financingType,
                contractData.terms.closingDate,
                JSON.stringify(contractData.contingencies),
                JSON.stringify(contractData.inclusions),
                JSON.stringify(contractData.exclusions),
                JSON.stringify(contractData.specialProvisions),
                template.attorneyReviewDays,
                attorneyReviewDeadline,
                pdfPath,
                'generated'
            ]);

            contract = contractResult.rows[0];
        }

        // Update offer to track contract generation
        await pool.query(
            `UPDATE offers 
       SET updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
            [offerId]
        );



        // Send email notifications
        // sendContractNotifications(contractData, contract, pdfPath, offerId).catch(err => {
        //     console.error('Email notification error:', err);
        // });

       const status = await pool.query(
            `UPDATE task_value 
                SET status = 'completed' 
                WHERE task_id = $1 AND transactions_id = $2   RETURNING id, status, updated_at` ,
            [16, offerId]
        );

        const stu = status.rows[0];


        await pool.query('COMMIT');

        res.json({
            success: true,
            // contract: {
            //     id: contract.id,
            //     contractId: contract.contract_id,
            //     status: contract.status,
            //     downloadUrl: `/api/contracts/${contract.id}/download`,
            //     generatedAt: contract.generated_at,
            //     attorneyReviewDeadline: contract.attorney_review_deadline
            // },
            stu
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Contract generation error:', error);
        res.status(500).json({ error: 'Failed to generate contract', details: error.message });
    }
});

// Get Contract Details
router.get('/:contractId', async (req, res) => {
    try {
        const { contractId } = req.params;

        const result = await pool.query(
            'SELECT * FROM contracts WHERE id = $1',
            [contractId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        const contract = result.rows[0];

        // Get signatures
        const signaturesResult = await pool.query(
            'SELECT * FROM contract_signatures WHERE contract_id = $1',
            [contractId]
        );

        res.json({
            success: true,
            contract: {
                ...contract,
                signatures: signaturesResult.rows
            }
        });

    } catch (error) {
        console.error('Fetch contract error:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

// Get Contract by Transaction ID
router.get('/transaction/:offerId', async (req, res) => {
    try {
        const { offerId } = req.params;

        const result = await pool.query(
            'SELECT * FROM contracts WHERE transactions_id = $1 ORDER BY created_at DESC LIMIT 1',
            [offerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        res.json({
            success: true,
            contract: result.rows[0]
        });

    } catch (error) {
        console.error('Fetch contract error:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

// Download Contract PDF
router.get('/:contractId/download', async (req, res) => {
    try {
        const { contractId } = req.params;

        const result = await pool.query(
            'SELECT pdf_path, contract_id FROM contracts WHERE id = $1',
            [contractId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        const contract = result.rows[0];

        // Check if file exists
        if (!fs.existsSync(contract.pdf_path)) {
            return res.status(404).json({ error: 'Contract file not found' });
        }

        res.download(contract.pdf_path, `Contract_${contract.contract_id}.pdf`);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download contract' });
    }
});

// ============================================
// PDF Generation Function
// ============================================
async function generateContractPDF(contractData) {
    return new Promise((resolve, reject) => {
        const fileName = `contract_${contractData.contractId}.pdf`;
        const uploadDir = path.join(__dirname, '../uploads/contracts');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold')
            .text(contractData.template, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).font('Helvetica')
            .text(`Contract ID: ${contractData.contractId}`, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Parties Section
        doc.fontSize(14).font('Helvetica-Bold').text('PARTIES TO THE AGREEMENT');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('BUYER:');
        doc.font('Helvetica')
            .text(contractData.buyer.name)
            .text(contractData.buyer.address || 'Address on file')
            .text(`Email: ${contractData.buyer.email}`)
            .text(`Phone: ${contractData.buyer.phone || 'N/A'}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('SELLER:');
        doc.font('Helvetica')
            .text(contractData.seller.name)
            .text(`Email: ${contractData.seller.email}`)
            .text(`Phone: ${contractData.seller.phone || 'N/A'}`);
        doc.moveDown(2);

        // Property Description
        doc.fontSize(14).font('Helvetica-Bold').text('PROPERTY DESCRIPTION');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica')
            .text(`Address: ${contractData.property.address}`)
            .text(`APN: ${contractData.property.apn || 'N/A'}`)
            .text(`Legal Description: ${contractData.property.legalDescription || 'See attached'}`);
        doc.moveDown(2);

        // Purchase Terms
        doc.fontSize(14).font('Helvetica-Bold').text('PURCHASE TERMS');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        doc.text(`Purchase Price: $${contractData.terms.purchasePrice.toLocaleString()}`);
        doc.text(`Earnest Money Deposit: $${contractData.terms.earnestMoney.toLocaleString()}`);
        doc.text(`Down Payment: $${contractData.terms.downPayment.toLocaleString()}`);
        doc.text(`Loan Amount: $${contractData.terms.loanAmount.toLocaleString()}`);
        doc.text(`Financing Type: ${contractData.terms.financingType}`);
        doc.text(`Closing Date: ${new Date(contractData.terms.closingDate).toLocaleDateString()}`);
        doc.moveDown(2);

        // Contingencies
        if (contractData.contingencies.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('CONTINGENCIES');
            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            contractData.contingencies.forEach((cont, idx) => {
                doc.text(`${idx + 1}. ${cont.type?.toUpperCase() || 'CONTINGENCY'}`);
                doc.text(`   ${cont.description}`);
                doc.text(`   Deadline: ${new Date(cont.deadline).toLocaleDateString()}`);
                doc.moveDown(0.5);
            });
            doc.moveDown();
        }

        // Inclusions & Exclusions
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('INCLUSIONS');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        if (contractData.inclusions.length > 0) {
            contractData.inclusions.forEach(item => {
                doc.text(`• ${item}`);
            });
        } else {
            doc.text('• All fixtures and fittings currently attached to the property');
        }
        doc.moveDown();

        if (contractData.exclusions.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('EXCLUSIONS');
            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            contractData.exclusions.forEach(item => {
                doc.text(`• ${item}`);
            });
            doc.moveDown();
        }

        // Attorney Review Period
        if (contractData.attorneyReviewDays > 0) {
            doc.moveDown();
            doc.fontSize(12).font('Helvetica-Bold')
                .text(`ATTORNEY REVIEW PERIOD: ${contractData.attorneyReviewDays} DAYS`);
            doc.fontSize(11).font('Helvetica')
                .text(`Either party may cancel this contract within ${contractData.attorneyReviewDays} business days of receipt by providing written notice.`);
            doc.moveDown();
        }

        // Special Provisions
        if (contractData.specialProvisions.length > 0) {
            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').text('SPECIAL PROVISIONS');
            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            contractData.specialProvisions.forEach((provision, idx) => {
                doc.text(`${idx + 1}. ${provision}`);
                doc.moveDown(0.5);
            });
        }

        // Signatures Page
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES');
        doc.moveDown(2);

        // Buyer signature
        doc.fontSize(11).font('Helvetica-Bold').text('BUYER:');
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(300, doc.y).stroke();
        doc.text('Signature', 50, doc.y + 5);
        doc.text('Date: _________________', 320, doc.y - 15);
        doc.moveDown(0.5);
        doc.font('Helvetica').text(contractData.buyer.name, 50);
        doc.moveDown(3);

        // Seller signature
        doc.font('Helvetica-Bold').text('SELLER:');
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(300, doc.y).stroke();
        doc.text('Signature', 50, doc.y + 5);
        doc.text('Date: _________________', 320, doc.y - 15);
        doc.moveDown(0.5);
        doc.font('Helvetica').text(contractData.seller.name, 50);

        doc.end();

        stream.on('finish', () => {
            resolve(filePath);
        });

        stream.on('error', reject);
    });
}

// ============================================
// Email Notification Function - UPDATED
// ============================================
async function sendContractNotifications(contractData, contract, pdfPath, offerId) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Buyer Email
    const buyerEmail = {
        from: `"${process.env.APP_NAME || 'RealEstate Platform'}" <${process.env.SMTP_FROM || 'noreply@realestate.com'}>`,
        to: contractData.buyer.email,
        subject: 'Contract Ready for Review',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Your Purchase Contract is Ready!</h1>
          </div>
          <div class="content">
            <p>Hi ${contractData.buyer.name.split(' ')[0]},</p>
            <p><strong>Great news!</strong> Your purchase contract for <strong>${contractData.property.address}</strong> has been generated and is ready for your review.</p>
            
            <div class="details">
              <h3>Contract Details</h3>
              <div class="details-row">
                <span>Contract ID:</span>
                <strong>${contractData.contractId}</strong>
              </div>
              <div class="details-row">
                <span>Property:</span>
                <strong>${contractData.property.address}</strong>
              </div>
              <div class="details-row">
                <span>Purchase Price:</span>
                <strong>$${contractData.terms.purchasePrice.toLocaleString()}</strong>
              </div>
              <div class="details-row">
                <span>Closing Date:</span>
                <strong>${new Date(contractData.terms.closingDate).toLocaleDateString()}</strong>
              </div>
            </div>
            
            ${contractData.attorneyReviewDays > 0 ? `
              <div class="warning">
                <strong>⚖️ Attorney Review Period:</strong><br>
                You have ${contractData.attorneyReviewDays} business days for attorney review.
              </div>
            ` : ''}
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Download and review the attached contract</li>
              <li>Have your attorney review it (if applicable)</li>
              <li>Sign the contract in the platform when ready</li>
            </ol>
            
            <center>
              <a href="${frontendUrl}/offers/${offerId}/contract" class="button">View Contract Online</a>
            </center>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If you have questions, please contact your agent or our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        attachments: [
            {
                filename: `Contract_${contractData.contractId}.pdf`,
                path: pdfPath
            }
        ]
    };

    // Seller Email
    const sellerEmail = {
        from: `"${process.env.APP_NAME || 'RealEstate Platform'}" <${process.env.SMTP_FROM || 'noreply@realestate.com'}>`,
        to: contractData.seller.email,
        subject: 'Purchase Contract Generated',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Purchase Contract Generated</h1>
          </div>
          <div class="content">
            <p>Hi ${contractData.seller.name.split(' ')[0]},</p>
            <p>A purchase contract has been generated for your property at <strong>${contractData.property.address}</strong>.</p>
            
            <div class="details">
              <h3>Contract Details</h3>
              <div class="details-row">
                <span>Contract ID:</span>
                <strong>${contractData.contractId}</strong>
              </div>
              <div class="details-row">
                <span>Buyer:</span>
                <strong>${contractData.buyer.name}</strong>
              </div>
              <div class="details-row">
                <span>Purchase Price:</span>
                <strong>$${contractData.terms.purchasePrice.toLocaleString()}</strong>
              </div>
              <div class="details-row">
                <span>Closing Date:</span>
                <strong>${new Date(contractData.terms.closingDate).toLocaleDateString()}</strong>
              </div>
            </div>
            
            <p>The contract has been sent to the buyer for review and signature. You'll be notified when it's your turn to sign.</p>
            
            <center>
              <a href="${frontendUrl}/offers/${offerId}/contract" class="button">View Contract Online</a>
            </center>
          </div>
        </div>
      </body>
      </html>
    `,
        attachments: [
            {
                filename: `Contract_${contractData.contractId}.pdf`,
                path: pdfPath
            }
        ]
    };

    await Promise.all([
        transporter.sendMail(buyerEmail),
        transporter.sendMail(sellerEmail)
    ]);
}

module.exports = router;