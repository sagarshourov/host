const cron = require('node-cron');
const Document = require('../models/Document');
const EmailService = require('../services/emailService');

// Check for expiring documents daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running expiration check...');
  
  try {
    const emailService = new EmailService();
    
    // Find documents expiring in next 7 days
    const expiringDocs = await Document.findExpiring(7);
    
    for (const doc of expiringDocs) {
      await emailService.sendExpirationWarning(doc);
    }
    
    // Find documents that haven't been viewed in 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const unviewedDocs = await Document.find({
      status: 'sent',
      'tracking.sentAt': { $lte: threeDaysAgo },
      'tracking.viewedAt': { $exists: false }
    });
    
    for (const doc of unviewedDocs) {
      await emailService.sendReminderEmail(doc, 'seller');
    }
    
    console.log(`Processed ${expiringDocs.length} expiring documents and ${unviewedDocs.length} unviewed documents`);
    
  } catch (error) {
    console.error('Cron job error:', error);
  }
});

module.exports = cron;