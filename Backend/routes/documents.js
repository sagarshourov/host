// =====================================
// routes/documents.js - Document routes
// =====================================
const router = require('express').Router();
const Document = require('../models/Document');
const PDFGenerator = require('../utils/pdfGenerator');
//const EmailService = require('../services/emailService');
const DocuSignService = require('../services/docusignService');
const { authenticateToken } = require('../middleware/auth');


// Generate new LOI
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

router.post('/generate-loi', authenticateToken, async (req, res) => {
    try {
        const formData = req.body;
        const documentId = uuidv4();

        // Generate PDF
        const pdfGenerator = new PDFGenerator();
        const pdfFileName = `LOI_${documentId}.pdf`;
        const pdfPath = path.join(__dirname, '..', 'temp', pdfFileName);

        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Generate the PDF
        await pdfGenerator.generateLOI(formData, pdfPath);

        // Set response headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);

        // Stream the PDF file to the response
        const fileStream = fs.createReadStream(pdfPath);
        fileStream.pipe(res);

        // Clean up the file after streaming
        fileStream.on('close', () => {
            fs.unlink(pdfPath, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
        });

        fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to stream PDF file'
            });
        });

    } catch (error) {
        console.error('Error generating LOI:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Send LOI to seller with DocuSign
router.post('/send-loi/:documentId', authenticateToken, async (req, res) => {
    try {
        const { documentId } = req.params;
        const { useDocuSign } = req.body;

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        if (useDocuSign) {
            // Send via DocuSign for electronic signature
            const docusignService = new DocuSignService();
            const envelopeId = await docusignService.sendForSignature(document);

            document.metadata.docusignEnvelopeId = envelopeId;
            document.status = 'sent';
            document.tracking.sentAt = new Date();
            await document.save();

            res.json({
                success: true,
                message: 'Document sent via DocuSign for signature',
                envelopeId
            });
        } else {
            // Send via regular email
            const emailService = new EmailService();
            await emailService.sendLOI(document);

            document.status = 'sent';
            document.tracking.sentAt = new Date();
            await document.save();

            res.json({
                success: true,
                message: 'Letter of Intent sent to seller via email'
            });
        }

    } catch (error) {
        console.error('Error sending LOI:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get document by ID
router.get('/:documentId', async (req, res) => {
    try {
        const document = await Document.findOne({ documentId: req.params.documentId });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        // Track view
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');
        await document.markAsViewed(ipAddress, userAgent);

        res.json({
            success: true,
            document
        });

    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user's documents
router.get('/user/documents', authenticateToken, async (req, res) => {
    try {
        const documents = await Document.find({
            $or: [
                { 'buyer.userId': req.user.id },
                { 'seller.userId': req.user.id }
            ]
        }).sort('-createdAt');

        res.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Error fetching user documents:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update document status
router.patch('/:documentId/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const document = await Document.findOne({ documentId: req.params.documentId });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        document.status = status;
        document.tracking.updatedAt = new Date();

        if (status === 'accepted') {
            document.tracking.completedAt = new Date();

            // Notify buyer
            const emailService = new EmailService();
            await emailService.sendAcceptanceNotification(document);
        }

        await document.save();

        res.json({
            success: true,
            message: 'Document status updated',
            document
        });

    } catch (error) {
        console.error('Error updating document status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;