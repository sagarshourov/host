const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Twilio configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const html = generateEmailTemplate(template, data);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

const sendSMS = async (to, message) => {
  if (!twilioClient) {
    console.log('Twilio not configured');
    return false;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    console.log(`SMS sent to ${to}`);
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
};

const generateEmailTemplate = (template, data) => {
  const templates = {
    tourConfirmation: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Property Tour Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>Your property tour has been confirmed!</p>
            <h3>Tour Details:</h3>
            <ul>
              <li><strong>Property:</strong> ${data.property}</li>
              <li><strong>Date:</strong> ${data.date}</li>
              <li><strong>Time:</strong> ${data.time}</li>
              <li><strong>Confirmation Code:</strong> ${data.confirmationCode}</li>
            </ul>
            <p>We'll send you a reminder 24 hours before your tour.</p>
            <p><a href="${data.propertyLink}" class="button">View Property</a></p>
          </div>
          <div class="footer">
            <p>If you need to reschedule or cancel, please use your confirmation code.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    newTourNotification: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Tour Scheduled!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.sellerName},</p>
            <p>A new tour has been scheduled for your property!</p>
            <h3>Buyer Information:</h3>
            <ul>
              <li><strong>Name:</strong> ${data.buyerName}</li>
              <li><strong>Email:</strong> ${data.buyerEmail}</li>
              <li><strong>Phone:</strong> ${data.buyerPhone || 'Not provided'}</li>
            </ul>
            <h3>Tour Details:</h3>
            <ul>
              <li><strong>Property:</strong> ${data.property}</li>
              <li><strong>Date:</strong> ${data.date}</li>
              <li><strong>Time:</strong> ${data.time}</li>
            </ul>
            <p>Please ensure the property is ready for the tour.</p>
          </div>
          <div class="footer">
            <p>You'll receive feedback after the tour is completed.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    tourReminder: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tour Reminder</h1>
          </div>
          <div class="content">
            <p>This is a reminder about your property tour tomorrow!</p>
            <h3>Details:</h3>
            <ul>
              <li><strong>Property:</strong> ${data.property}</li>
              <li><strong>Date:</strong> ${data.date}</li>
              <li><strong>Time:</strong> ${data.time}</li>
              ${data.accessInstructions ? `<li><strong>Access Instructions:</strong> ${data.accessInstructions}</li>` : ''}
              ${data.gateCode ? `<li><strong>Gate Code:</strong> ${data.gateCode}</li>` : ''}
            </ul>
            <p>If you need to reschedule or cancel, please do so as soon as possible.</p>
          </div>
          <div class="footer">
            <p>We look forward to showing you the property!</p>
          </div>
        </div>
      </body>
      </html>
    `,
    tourCancellation: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tour Cancelled</h1>
          </div>
          <div class="content">
            <p>Your property tour has been cancelled.</p>
            <h3>Cancelled Tour:</h3>
            <ul>
              <li><strong>Property:</strong> ${data.property}</li>
              <li><strong>Date:</strong> ${data.date}</li>
              <li><strong>Time:</strong> ${data.time}</li>
              ${data.reason ? `<li><strong>Reason:</strong> ${data.reason}</li>` : ''}
            </ul>
            <p>You can schedule a new tour at any time through our platform.</p>
          </div>
          <div class="footer">
            <p>We apologize for any inconvenience.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return templates[template] || '<p>Template not found</p>';
};

module.exports = { sendEmail, sendSMS };