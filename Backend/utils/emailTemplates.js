const emailTemplates = {
  loiSent: (data) => ({
    subject: `Letter of Intent - ${data.propertyAddress}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: white; }
          .terms { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { 
            display: inline-block; 
            padding: 10px 20px; 
            background-color: #ff6b35; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Letter of Intent to Purchase Real Estate</h2>
          </div>
          <div class="content">
            <p>Dear ${data.sellerName},</p>
            
            <p>${data.buyerName} has submitted a Letter of Intent for your property located at:</p>
            <p><strong>${data.propertyAddress}, ${data.propertyCity}, ${data.propertyState}</strong></p>
            
            <div class="terms">
              <h3>Key Terms:</h3>
              <ul>
                <li><strong>Purchase Price:</strong> ${data.purchasePrice}</li>
                <li><strong>Deposit Amount:</strong> ${data.depositAmount}</li>
                <li><strong>Proposed Possession Date:</strong> ${data.possessionDate}</li>
                <li><strong>Financing Required:</strong> ${data.financingRequired}</li>
              </ul>
            </div>
            
            <p>Please review the attached Letter of Intent document for complete terms and conditions.</p>
            
            <p style="text-align: center;">
              <a href="${data.viewLink}" class="button">View Letter of Intent</a>
            </p>
            
            <p><strong>Important:</strong> This Letter of Intent is non-binding and serves as a basis for negotiating a formal Purchase Agreement.</p>
            
            <p>To accept or respond to this letter, please contact the buyer at:</p>
            <p>
              ${data.buyerName}<br>
              ${data.buyerEmail}<br>
              ${data.buyerPhone || ''}
            </p>
          </div>
          <div class="footer">
            <p>This email was sent through Your Platform Name</p>
            <p>Document ID: ${data.documentId}</p>
            <p>If you have questions, please contact support@yourplatform.com</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),
  
  loiViewed: (data) => ({
    subject: `Your Letter of Intent has been viewed`,
    html: `
      <p>Hi ${data.buyerName},</p>
      <p>Good news! ${data.sellerName} has viewed your Letter of Intent for the property at ${data.propertyAddress}.</p>
      <p>Viewed at: ${data.viewedAt}</p>
      <p>You may want to follow up with the seller to discuss next steps.</p>
    `
  }),
  
  loiAccepted: (data) => ({
    subject: `Letter of Intent Accepted - Next Steps`,
    html: `
      <p>Congratulations ${data.buyerName}!</p>
      <p>${data.sellerName} has accepted your Letter of Intent for ${data.propertyAddress}.</p>
      <p>Next steps:</p>
      <ol>
        <li>Schedule property inspection</li>
        <li>Finalize financing arrangements</li>
        <li>Negotiate formal Purchase Agreement</li>
        <li>Complete due diligence</li>
      </ol>
      <p>We recommend consulting with a real estate attorney to proceed with the formal purchase agreement.</p>
    `
  })
};

module.exports = emailTemplates;