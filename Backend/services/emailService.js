const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    // Use SendGrid in production, nodemailer for development
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendgrid = sgMail;
    } else {
      // Nodemailer transporter
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }
  }
  
  async sendEmail(to, subject, html, attachments = []) {
    try {
      if (this.sendgrid) {
        // SendGrid
        const msg = {
          to,
          from: process.env.EMAIL_USER,
          subject,
          html,
          attachments: attachments.map(att => ({
            content: fs.readFileSync(att.path).toString('base64'),
            filename: att.filename,
            type: att.type || 'application/pdf',
            disposition: 'attachment'
          }))
        };
        
        await this.sendgrid.send(msg);
      } else {
        // Nodemailer
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to,
          subject,
          html,
          attachments
        };
        
        await this.transporter.sendMail(mailOptions);
      }
      
      console.log(`Email sent to ${to}: ${subject}`);
      return true;
      
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }
  
  async sendLOI(document) {
    const subject = `Letter of Intent - ${document.property.address}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background-color: white; border: 1px solid #e1e1e1; border-radius: 0 0 10px 10px; }
          .terms { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .terms h3 { color: #667eea; margin-top: 0; }
          .terms ul { margin: 10px 0; }
          .terms li { margin: 8px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 25px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .info-box {
            background-color: #e8f4f8;
            border: 1px solid #b8dae8;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .contact-info {
            background-color: #f0f0f0;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Letter of Intent</h1>
            <p style="margin: 10px 0 0 0;">Real Estate Purchase Proposal</p>
          </div>
          
          <div class="content">
            <p>Dear ${document.seller.name},</p>
            
            <p><strong>${document.buyer.name}</strong> has submitted a Letter of Intent for your property located at:</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #2c3e50;">📍 Property Address</h3>
              <p style="font-size: 18px; margin: 5px 0;">
                <strong>${document.property.address}</strong><br>
                ${document.property.city}, ${document.property.state} ${document.property.zip || ''}
              </p>
            </div>
            
            <div class="terms">
              <h3>💰 Proposed Terms</h3>
              <ul style="list-style: none; padding-left: 0;">
                <li>💵 <strong>Purchase Price:</strong> $${parseInt(document.financial.purchasePrice).toLocaleString()}</li>
                <li>💳 <strong>Earnest Money Deposit:</strong> $${parseInt(document.financial.depositAmount).toLocaleString()}</li>
                <li>📅 <strong>Proposed Closing Date:</strong> ${new Date(document.dates.possessionDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</li>
                <li>🏦 <strong>Financing:</strong> ${document.financial.financingRequired ? 
                  `Required ($${parseInt(document.financial.financingAmount || 0).toLocaleString()} at ${document.financial.interestRate}% for ${document.financial.loanTermYears} years)` : 
                  'Cash Purchase'}</li>
                <li>📜 <strong>Deed Type:</strong> ${document.terms.deedType === 'warranty' ? 'Warranty Deed' : 'Special Warranty Deed'}</li>
              </ul>
            </div>
            
            <p>Please review the attached Letter of Intent document for complete terms and conditions.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/document/${document.documentId}" class="button">
                📄 View Full Letter of Intent
              </a>
            </div>
            
            <div class="info-box" style="background-color: #fff3cd; border-color: #ffc107;">
              <p style="margin: 0;">
                <strong>⚠️ Important:</strong> This Letter of Intent is <strong>non-binding</strong> and serves as a basis for negotiating a formal Purchase Agreement. 
                ${document.terms.standStillProvision ? `However, the Stand Still provision IS binding until ${new Date(document.dates.standStillEndDate).toLocaleDateString()}.` : ''}
              </p>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Review the complete Letter of Intent document</li>
              <li>Contact the buyer to discuss terms</li>
              <li>Negotiate any necessary changes</li>
              <li>Proceed to formal Purchase Agreement if terms are acceptable</li>
            </ol>
            
            <div class="contact-info">
              <h4 style="margin-top: 0;">📞 Buyer Contact Information:</h4>
              <p style="margin: 5px 0;">
                <strong>${document.buyer.name}</strong><br>
                ${document.buyer.email ? `✉️ Email: ${document.buyer.email}<br>` : ''}
                ${document.buyer.phone ? `📱 Phone: ${document.buyer.phone}<br>` : ''}
                ${document.buyer.address ? `📍 Address: ${document.buyer.address}, ${document.buyer.city}, ${document.buyer.state} ${document.buyer.zip}` : ''}
              </p>
            </div>
            
            <p>If you have any questions about this Letter of Intent or would like to proceed with negotiations, please contact the buyer directly.</p>
            
            <p>Best regards,<br>
            The Real Estate Platform Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent through [Your Platform Name]</p>
            <p>Document ID: ${document.documentId}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 20px 0;">
            <p>
              If you have questions about our platform, please contact:<br>
              📧 support@yourplatform.com | 📞 1-800-XXX-XXXX
            </p>
            <p style="font-size: 10px; color: #999;">
              This email contains confidential information. If you received this in error, please delete it and notify the sender.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const attachments = [];
    if (document.files.pdfPath && fs.existsSync(document.files.pdfPath)) {
      attachments.push({
        filename: `LOI_${document.property.address.replace(/\s+/g, '_')}.pdf`,
        path: document.files.pdfPath
      });
    }
    
    await this.sendEmail(document.seller.email, subject, html, attachments);
    
    // Send confirmation to buyer
    await this.sendBuyerConfirmation(document);
  }
  
  async sendBuyerConfirmation(document) {
    const subject = `Letter of Intent Sent - ${document.property.address}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Letter of Intent Has Been Sent!</h2>
        <p>Hi ${document.buyer.name},</p>
        <p>Your Letter of Intent for <strong>${document.property.address}</strong> has been successfully sent to ${document.seller.name}.</p>
        
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What Happens Next?</h3>
          <ol>
            <li>The seller will review your Letter of Intent</li>
            <li>You'll be notified when they view the document</li>
            <li>They may contact you to discuss terms</li>
            <li>If accepted, you'll proceed to a formal Purchase Agreement</li>
          </ol>
        </div>
        
        <p>You can track the status of your document at any time:</p>
        <p style="text-align: center;">
          <a href="${process.env.CLIENT_URL}/document/${document.documentId}" 
             style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            View Document Status
          </a>
        </p>
        
        <p>Document ID: ${document.documentId}</p>
        <p>Sent: ${new Date().toLocaleString()}</p>
        
        <p>Best regards,<br>Your Real Estate Platform Team</p>
      </div>
    `;
    
    await this.sendEmail(document.buyer.email, subject, html);
  }
  
  async sendAcceptanceNotification(document) {
    const subject = `Letter of Intent Accepted! - ${document.property.address}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🎉 Congratulations!</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e1e1e1; border-radius: 0 0 10px 10px;">
          <p>Dear ${document.buyer.name},</p>
          
          <p><strong>Great news!</strong> ${document.seller.name} has accepted your Letter of Intent for:</p>
          
          <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 18px; margin: 5px 0;">
              <strong>${document.property.address}</strong><br>
              ${document.property.city}, ${document.property.state}
            </p>
          </div>
          
          <h3>📋 Next Steps:</h3>
          <ol>
            <li><strong>Schedule Property Inspection</strong> - Arrange for a professional inspection within ${document.terms.inspectionDays || 10} days</li>
            <li><strong>Finalize Financing</strong> - Complete your loan application if applicable</li>
            <li><strong>Hire a Real Estate Attorney</strong> - To draft the formal Purchase Agreement</li>
            <li><strong>Title Search</strong> - Ensure clear title to the property</li>
            <li><strong>Property Appraisal</strong> - Required for mortgage approval</li>
          </ol>
          
          <h3>📅 Important Dates:</h3>
          <ul>
            <li>Inspection Deadline: ${new Date(document.dates.inspectionDeadline || Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
            <li>Financing Deadline: ${new Date(document.dates.conditionsDeadline).toLocaleDateString()}</li>
            <li>Closing Date: ${new Date(document.dates.possessionDate).toLocaleDateString()}</li>
          </ul>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>⚠️ Important:</strong> While the LOI has been accepted, you still need to execute a formal Purchase Agreement. We recommend consulting with a real estate attorney immediately.</p>
          </div>
          
          <h3>Seller Contact:</h3>
          <p>
            ${document.seller.name}<br>
            ${document.seller.email || ''}<br>
            ${document.seller.phone || ''}
          </p>
          
          <p>Congratulations on this important step toward purchasing your property!</p>
          
          <p>Best regards,<br>Your Real Estate Platform Team</p>
        </div>
      </div>
    `;
    
    await this.sendEmail(document.buyer.email, subject, html);
  }
  
  async sendCompletionNotification(document) {
    const buyerSubject = `Documents Fully Signed - ${document.property.address}`;
    const sellerSubject = `Documents Fully Signed - ${document.property.address}`;
    
    const buyerHtml = `
      <h2>All Parties Have Signed!</h2>
      <p>Dear ${document.buyer.name},</p>
      <p>All parties have successfully signed the Letter of Intent for ${document.property.address}.</p>
      <p>The signed document is attached to this email for your records.</p>
      <p>Next step: Work with your attorney to draft the formal Purchase Agreement.</p>
    `;
    
    const sellerHtml = `
      <h2>All Parties Have Signed!</h2>
      <p>Dear ${document.seller.name},</p>
      <p>All parties have successfully signed the Letter of Intent for ${document.property.address}.</p>
      <p>The signed document is attached to this email for your records.</p>
      <p>The buyer will be in touch regarding the formal Purchase Agreement.</p>
    `;
    
    // Send to buyer with signed document
    const attachments = [];
    if (document.files.signedPdfPath && fs.existsSync(document.files.signedPdfPath)) {
      attachments.push({
        filename: `Signed_LOI_${document.property.address.replace(/\s+/g, '_')}.pdf`,
        path: document.files.signedPdfPath
      });
    }
    
    await this.sendEmail(document.buyer.email, buyerSubject, buyerHtml, attachments);
    await this.sendEmail(document.seller.email, sellerSubject, sellerHtml, attachments);
  }
  
  async sendReminderEmail(document, recipientType = 'seller') {
    const recipient = recipientType === 'seller' ? document.seller : document.buyer;
    const subject = `Reminder: Letter of Intent Pending - ${document.property.address}`;
    
    const html = `
      <h2>Reminder: Action Required</h2>
      <p>Dear ${recipient.name},</p>
      <p>This is a friendly reminder that you have a pending Letter of Intent for:</p>
      <p><strong>${document.property.address}</strong></p>
      <p>The document was sent on ${new Date(document.tracking.sentAt).toLocaleDateString()} and requires your review.</p>
      <p><a href="${process.env.CLIENT_URL}/document/${document.documentId}">Click here to review the document</a></p>
      <p>If you have any questions, please contact ${recipientType === 'seller' ? document.buyer.name : document.seller.name}.</p>
    `;
    
    await this.sendEmail(recipient.email, subject, html);
  }
  
  async sendExpirationWarning(document) {
    const subject = `Warning: Letter of Intent Expiring Soon - ${document.property.address}`;
    
    const html = `
      <h2>⚠️ Your Letter of Intent is Expiring Soon</h2>
      <p>Dear ${document.buyer.name},</p>
      <p>Your Letter of Intent for <strong>${document.property.address}</strong> will expire on ${new Date(document.dates.expirationDate).toLocaleDateString()}.</p>
      <p>If you wish to proceed with this purchase, please contact the seller immediately to negotiate a formal Purchase Agreement.</p>
      <p>Seller Contact: ${document.seller.name} - ${document.seller.email || document.seller.phone || 'Contact information on file'}</p>
    `;
    
    await this.sendEmail(document.buyer.email, subject, html);
    
    // Also notify seller
    const sellerHtml = `
      <h2>Letter of Intent Expiring</h2>
      <p>Dear ${document.seller.name},</p>
      <p>The Letter of Intent from ${document.buyer.name} for your property at <strong>${document.property.address}</strong> will expire on ${new Date(document.dates.expirationDate).toLocaleDateString()}.</p>
      <p>If you wish to proceed, please contact the buyer to finalize terms.</p>
    `;
    
    await this.sendEmail(document.seller.email, subject, sellerHtml);
  }
}

module.exports = EmailService;