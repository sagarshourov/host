const router = require('express').Router();
const Document = require('../models/Document');
//const EmailService = require('../services/emailService');
const DocuSignService = require('../services/docusignService');

// DocuSign webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const data = req.body;
    
    // Verify the webhook (implement HMAC verification in production)
    // const isValid = verifyWebhookSignature(req);
    
    const envelopeId = data.envelopeId;
    const status = data.status;
    
    // Find document by envelope ID
    const document = await Document.findOne({
      'metadata.docusignEnvelopeId': envelopeId
    });
    
    if (!document) {
      console.error('Document not found for envelope:', envelopeId);
      return res.status(200).send('OK');
    }
    
    // Update document status based on envelope status
    switch (status) {
      case 'sent':
        document.status = 'sent';
        document.tracking.sentAt = new Date();
        break;
        
      case 'delivered':
        document.status = 'viewed';
        document.tracking.viewedAt = new Date();
        break;
        
      case 'completed':
        document.status = 'signed';
        document.tracking.signedAt = new Date();
        document.tracking.completedAt = new Date();
        
        // Download signed document
        const docusignService = new DocuSignService();
        const signedPath = await docusignService.downloadSignedDocument(envelopeId);
        document.files.signedPdfPath = signedPath;
        
        // Send notifications
        const emailService = new EmailService();
        await emailService.sendCompletionNotification(document);
        break;
        
      case 'declined':
        document.status = 'rejected';
        break;
        
      case 'voided':
        document.status = 'expired';
        break;
    }
    
    // Update recipient statuses
    if (data.recipientStatuses) {
      for (const recipient of data.recipientStatuses) {
        if (recipient.email === document.buyer.email) {
          document.signatures.buyer.signed = recipient.status === 'completed';
          document.signatures.buyer.signedAt = recipient.signedDateTime;
        } else if (recipient.email === document.seller.email) {
          document.signatures.seller.signed = recipient.status === 'completed';
          document.signatures.seller.signedAt = recipient.signedDateTime;
        }
      }
    }
    
    await document.save();
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get signing URL for a document
router.post('/get-signing-url/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { signerEmail } = req.body;
    
    const document = await Document.findOne({ documentId });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const docusignService = new DocuSignService();
    const envelopeId = document.metadata.docusignEnvelopeId;
    
    // Create recipient view
    const viewRequest = {
      returnUrl: `${process.env.CLIENT_URL}/signing-complete`,
      authenticationMethod: 'none',
      email: signerEmail,
      userName: signerEmail === document.buyer.email ? document.buyer.name : document.seller.name,
      recipientId: signerEmail === document.buyer.email ? '1' : '2'
    };
    
    const envelopesApi = new docusign.EnvelopesApi(docusignService.apiClient);
    const results = await envelopesApi.createRecipientView(
      docusignService.accountId,
      envelopeId,
      { recipientViewRequest: viewRequest }
    );
    
    res.json({
      success: true,
      signingUrl: results.url
    });
    
  } catch (error) {
    console.error('Error getting signing URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check envelope status
router.get('/status/:envelopeId', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const docusignService = new DocuSignService();
    const status = await docusignService.getEnvelopeStatus(envelopeId);
    
    res.json({
      success: true,
      status
    });
    
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;