const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');

class DocuSignService {
  constructor() {
    // DocuSign configuration
    this.basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
    this.accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    this.integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    this.userId = process.env.DOCUSIGN_USER_ID;
    this.privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
    
    // Initialize API client
    this.apiClient = new docusign.ApiClient();
    this.apiClient.setBasePath(this.basePath);
    
    // Set up authentication
    this.authenticate();
  }
  
  async authenticate() {
    try {
      // Request JWT token
      const results = await this.apiClient.requestJWTUserToken(
        this.integrationKey,
        this.userId,
        ['signature', 'impersonation'],
        this.privateKey,
        3600
      );
      
      const accessToken = results.body.access_token;
      
      // Set the access token
      this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
      
      // Get user info
      const userInfo = await this.apiClient.getUserInfo(accessToken);
      this.accountId = userInfo.accounts[0].accountId;
      
      // Update base path if needed
      const baseUri = userInfo.accounts[0].baseUri;
      this.apiClient.setBasePath(baseUri + '/restapi');
      
      return true;
    } catch (error) {
      console.error('DocuSign authentication error:', error);
      throw error;
    }
  }
  
  async sendForSignature(document) {
    try {
      // Re-authenticate if needed
      await this.authenticate();
      
      // Create envelope definition
      const envelopeDefinition = this.createEnvelopeDefinition(document);
      
      // Create envelope
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.createEnvelope(this.accountId, {
        envelopeDefinition: envelopeDefinition
      });
      
      const envelopeId = results.envelopeId;
      
      // Get signing URLs
      const viewRequest = this.createRecipientViewRequest(document, envelopeId);
      const viewResults = await envelopesApi.createRecipientView(this.accountId, envelopeId, {
        recipientViewRequest: viewRequest
      });
      
      return {
        envelopeId: envelopeId,
        signingUrl: viewResults.url
      };
      
    } catch (error) {
      console.error('DocuSign send error:', error);
      throw error;
    }
  }
  
  createEnvelopeDefinition(document) {
    // Read PDF file
    const pdfBytes = fs.readFileSync(document.files.pdfPath);
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    
    // Create the envelope definition
    const envelopeDefinition = new docusign.EnvelopeDefinition();
    envelopeDefinition.emailSubject = `Letter of Intent - ${document.property.address}`;
    envelopeDefinition.emailBlurb = 'Please review and sign this Letter of Intent for the property purchase.';
    
    // Add document
    const doc = new docusign.Document();
    doc.documentBase64 = pdfBase64;
    doc.name = 'Letter of Intent';
    doc.fileExtension = 'pdf';
    doc.documentId = '1';
    
    envelopeDefinition.documents = [doc];
    
    // Create signers
    const buyerSigner = new docusign.Signer();
    buyerSigner.email = document.buyer.email;
    buyerSigner.name = document.buyer.name;
    buyerSigner.recipientId = '1';
    buyerSigner.routingOrder = '1';
    buyerSigner.roleName = 'Buyer';
    
    const sellerSigner = new docusign.Signer();
    sellerSigner.email = document.seller.email;
    sellerSigner.name = document.seller.name;
    sellerSigner.recipientId = '2';
    sellerSigner.routingOrder = '2';
    sellerSigner.roleName = 'Seller';
    
    // Create signature tabs for buyer
    const buyerSignHere = new docusign.SignHere();
    buyerSignHere.documentId = '1';
    buyerSignHere.pageNumber = '3';
    buyerSignHere.xPosition = '150';
    buyerSignHere.yPosition = '420';
    buyerSignHere.tabLabel = 'BuyerSignature';
    
    const buyerDateSigned = new docusign.DateSigned();
    buyerDateSigned.documentId = '1';
    buyerDateSigned.pageNumber = '3';
    buyerDateSigned.xPosition = '400';
    buyerDateSigned.yPosition = '420';
    buyerDateSigned.tabLabel = 'BuyerDate';
    
    buyerSigner.tabs = new docusign.Tabs();
    buyerSigner.tabs.signHereTabs = [buyerSignHere];
    buyerSigner.tabs.dateSignedTabs = [buyerDateSigned];
    
    // Create signature tabs for seller
    const sellerSignHere = new docusign.SignHere();
    sellerSignHere.documentId = '1';
    sellerSignHere.pageNumber = '3';
    sellerSignHere.xPosition = '150';
    sellerSignHere.yPosition = '500';
    sellerSignHere.tabLabel = 'SellerSignature';
    
    const sellerDateSigned = new docusign.DateSigned();
    sellerDateSigned.documentId = '1';
    sellerDateSigned.pageNumber = '3';
    sellerDateSigned.xPosition = '400';
    sellerDateSigned.yPosition = '500';
    sellerDateSigned.tabLabel = 'SellerDate';
    
    sellerSigner.tabs = new docusign.Tabs();
    sellerSigner.tabs.signHereTabs = [sellerSignHere];
    sellerSigner.tabs.dateSignedTabs = [sellerDateSigned];
    
    // Add recipients
    const recipients = new docusign.Recipients();
    recipients.signers = [buyerSigner, sellerSigner];
    
    envelopeDefinition.recipients = recipients;
    envelopeDefinition.status = 'sent';
    
    return envelopeDefinition;
  }
  
  createRecipientViewRequest(document, envelopeId) {
    const viewRequest = new docusign.RecipientViewRequest();
    
    viewRequest.returnUrl = `${process.env.CLIENT_URL}/signing-complete`;
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = document.buyer.email;
    viewRequest.userName = document.buyer.name;
    viewRequest.recipientId = '1';
    viewRequest.clientUserId = document.buyer.userId || '1001';
    
    return viewRequest;
  }
  
  async getEnvelopeStatus(envelopeId) {
    try {
      await this.authenticate();
      
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const envelope = await envelopesApi.getEnvelope(this.accountId, envelopeId);
      
      return {
        status: envelope.status,
        statusDateTime: envelope.statusDateTime,
        completedDateTime: envelope.completedDateTime,
        sentDateTime: envelope.sentDateTime
      };
      
    } catch (error) {
      console.error('DocuSign status error:', error);
      throw error;
    }
  }
  
  async downloadSignedDocument(envelopeId) {
    try {
      await this.authenticate();
      
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.getDocument(this.accountId, envelopeId, '1');
      
      const filename = `signed_LOI_${envelopeId}.pdf`;
      const filepath = path.join(__dirname, '..', 'downloads', filename);
      
      fs.writeFileSync(filepath, results);
      
      return filepath;
      
    } catch (error) {
      console.error('DocuSign download error:', error);
      throw error;
    }
  }
  
  // Set up webhook for envelope events
  async createWebhook(envelopeId) {
    const eventNotification = new docusign.EventNotification();
    eventNotification.url = `${process.env.SERVER_URL}/api/docusign/webhook`;
    eventNotification.loggingEnabled = true;
    eventNotification.requireAcknowledgment = true;
    eventNotification.includeDocuments = false;
    eventNotification.includeCertificateOfCompletion = false;
    eventNotification.includeEnvelopeVoidReason = true;
    eventNotification.includeTimeZone = true;
    eventNotification.includeSenderAccountAsCustomField = true;
    eventNotification.includeDocumentFields = true;
    eventNotification.includeCertificateWithSoap = false;
    
    // Set up events to track
    eventNotification.envelopeEvents = [
      { envelopeEventStatusCode: 'sent' },
      { envelopeEventStatusCode: 'delivered' },
      { envelopeEventStatusCode: 'completed' },
      { envelopeEventStatusCode: 'declined' },
      { envelopeEventStatusCode: 'voided' }
    ];
    
    eventNotification.recipientEvents = [
      { recipientEventStatusCode: 'Sent' },
      { recipientEventStatusCode: 'Delivered' },
      { recipientEventStatusCode: 'Completed' },
      { recipientEventStatusCode: 'Declined' },
      { recipientEventStatusCode: 'AuthenticationFailed' },
      { recipientEventStatusCode: 'AutoResponded' }
    ];
    
    return eventNotification;
  }
}

module.exports = DocuSignService;