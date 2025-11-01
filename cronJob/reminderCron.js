const cron = require('node-cron');
const pool = require('../config/database');
const { sendEmail, sendSMS } = require('../services/notificationService');

// Run every hour to check for pending reminders
cron.schedule('0 * * * *', async () => {
  console.log('Running reminder check...');
  
  try {
    // Get pending reminders that should be sent now
    const reminders = await pool.query(
      `SELECT 
        r.*,
        t.buyer_name,
        t.buyer_email,
        t.buyer_phone,
        t.tour_date,
        t.tour_time,
        t.access_instructions,
        t.gate_code,
        p.street_address,
        p.city,
        p.state,
        u.email as seller_email,
        u.phone as seller_phone,
        u.name as seller_name
       FROM tour_reminders r
       JOIN property_tours t ON r.tour_id = t.id
       JOIN properties p ON t.property_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE r.status = 'pending'
       AND r.scheduled_for <= NOW()
       AND t.status IN ('scheduled', 'confirmed')`
    );

    for (const reminder of reminders.rows) {
      try {
        let success = false;

        if (reminder.reminder_type === 'email') {
          const recipient = reminder.recipient_type === 'buyer' 
            ? reminder.buyer_email 
            : reminder.seller_email;

          success = await sendEmail({
            to: recipient,
            subject: 'Property Tour Reminder',
            template: 'tourReminder',
            data: {
              property: `${reminder.street_address}, ${reminder.city}, ${reminder.state}`,
              date: reminder.tour_date,
              time: reminder.tour_time,
              accessInstructions: reminder.access_instructions,
              gateCode: reminder.gate_code
            }
          });
        } else if (reminder.reminder_type === 'sms' && reminder.buyer_phone) {
          const message = `Reminder: Property tour tomorrow at ${reminder.tour_time} for ${reminder.street_address}. Confirmation code: ${reminder.confirmation_code}`;
          success = await sendSMS(reminder.buyer_phone, message);
        }

        // Update reminder status
        await pool.query(
          `UPDATE tour_reminders 
           SET status = $1, sent_at = NOW()
           WHERE id = $2`,
          [success ? 'sent' : 'failed', reminder.id]
        );

      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        await pool.query(
          `UPDATE tour_reminders 
           SET status = 'failed', error_message = $1
           WHERE id = $2`,
          [error.message, reminder.id]
        );
      }
    }

    console.log(`Processed ${reminders.rows.length} reminders`);

  } catch (error) {
    console.error('Reminder cron job error:', error);
  }
});