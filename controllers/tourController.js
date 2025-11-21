
const pool = require('../config/database');
//const { sendEmail, sendSMS } = require('../services/notificationService');
const { generateConfirmationCode } = require('../utils/helpers');

const tourController = {
  // Schedule a new tour
  scheduleTour: async (req, res) => {
    //const pool = await pool.connect();
    try {
      // await client.query('BEGIN');

      const {
        property_id,
        name,
        email,
        phone,
        date,
        time,
        message
      } = req.body;

      // Check if time slot is available
      // const availabilityCheck = await pool.query(
      //   `SELECT * FROM tour_availability 
      //    WHERE property_id = $1 
      //    AND available_date = $2 
      //    AND $3::time BETWEEN start_time AND end_time 
      //    AND is_active = true 
      //    AND current_bookings < max_tours`,
      //   [property_id, date, time]
      // );

      // // res.status(201).json({
      // //   success: true,
      // //   message: availabilityCheck

      // // });

      // if (availabilityCheck.rows.length === 0) {
      //   throw new Error('This time slot is not available');
      // }

      // Check for conflicting tours
      const conflictCheck = await pool.query(
        `SELECT * FROM property_tours 
         WHERE property_id = $1 
         AND tour_date = $2 
         AND tour_time = $3 
         AND status IN ('scheduled', 'confirmed')`,
        [property_id, date, time]
      );

      if (conflictCheck.rows.length > 0) {
        throw new Error('This time slot is already booked');
      }

      const confirmationCode = generateConfirmationCode();

      // Get property and seller details
      const propertyQuery = await pool.query(
        `SELECT p.*, u.email as seller_email, u.phone as seller_phone, u.first_name as seller_name
         FROM properties p
         JOIN users u ON p.seller_id = u.id
         WHERE p.id = $1`,
        [property_id]
      );

      const property = propertyQuery.rows[0];

      // Insert the tour
      const insertQuery = await pool.query(
        `INSERT INTO property_tours 
         (property_id, buyer_name, buyer_email, buyer_phone, tour_date, 
          tour_time, special_requests, confirmation_code, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
         RETURNING *`,
        [property_id, name, email, phone, date, time, message, confirmationCode]
      );

      const tour = insertQuery.rows[0];

      // Update availability slot booking count
      await pool.query(
        `UPDATE tour_availability 
         SET current_bookings = current_bookings + 1
         WHERE property_id = $1 AND available_date = $2 
         AND $3::time BETWEEN start_time AND end_time`,
        [property_id, date, time]
      );

      // Schedule reminders (24 hours before)
      const tourDateTime = new Date(`${date}T${time}`);
      const reminderTime = new Date(tourDateTime.getTime() - 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO tour_reminders (tour_id, recipient_type, reminder_type, scheduled_for)
         VALUES 
         ($1, 'buyer', 'email', $2),
         ($1, 'seller', 'email', $2)`,
        [tour.id, reminderTime]
      );

      if (phone) {
        await pool.query(
          `INSERT INTO tour_reminders (tour_id, recipient_type, reminder_type, scheduled_for)
           VALUES ($1, 'buyer', 'sms', $2)`,
          [tour.id, reminderTime]
        );
      }


      // get offer id 

      const property_offer = await pool.query(
        `SELECT id from offers WHERE property_id=$1 AND status='accepted'`,
        [property_id]
      );

      if (property_offer.rowCount > 0) {
        await pool.query(
          `UPDATE task_value 
                             SET status = 'completed' 
                             WHERE task_id = $1 AND transactions_id = $2`,
          [7, property_offer.rows[0].id]
        ); // done esign

      }




      //  await pool.query(
      //             `UPDATE task_value 
      //                        SET status = 'completed' 
      //                        WHERE task_id = $1 AND transactions_id = $2`,
      //             [11, offerId]
      //         ); // done esign





      await pool.query('COMMIT');

      // Send confirmation emails
      // await sendEmail({
      //   to: email,
      //   subject: 'Property Tour Confirmed',
      //   template: 'tourConfirmation',
      //   data: {
      //     name,
      //     property: property.street_address,
      //     date,
      //     time,
      //     confirmationCode,
      //     propertyLink: `${process.env.APP_URL}/properties/${property_id}`
      //   }
      // });

      // await sendEmail({
      //   to: property.seller_email,
      //   subject: 'New Tour Scheduled',
      //   template: 'newTourNotification',
      //   data: {
      //     sellerName: property.seller_name,
      //     buyerName: name,
      //     property: property.street_address,
      //     date,
      //     time,
      //     buyerPhone: phone,
      //     buyerEmail: email
      //   }
      // });

      res.status(201).json({
        success: true,
        message: 'Tour scheduled successfully',
        data: {
          id: tour.id,
          confirmationCode,
          property: {
            address: property.street_address,
            city: property.city,
            state: property.state
          },
          scheduledFor: `${date} at ${time}`
        }
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Schedule tour error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to schedule tour'
      });
    } finally {
      //pool.release();
    }
  },

  // Get available time slots for a property
  getAvailableSlots: async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { date } = req.query;

      const query = await pool.query(
        `SELECT 
          ta.id,
          ta.start_time,
          ta.end_time,
          ta.max_tours,
          ta.current_bookings,
          (ta.max_tours - ta.current_bookings) as slots_available
         FROM tour_availability ta
         WHERE ta.property_id = $1 
         AND ta.available_date = $2
         AND ta.is_active = true
         AND ta.current_bookings < ta.max_tours
         ORDER BY ta.start_time`,
        [propertyId, date]
      );

      // Get already booked slots for this date
      const bookedSlots = await pool.query(
        `SELECT tour_time 
         FROM property_tours 
         WHERE property_id = $1 
         AND tour_date = $2 
         AND status IN ('scheduled', 'confirmed')`,
        [propertyId, date]
      );

      const bookedTimes = bookedSlots.rows.map(row => row.tour_time);

      res.json({
        success: true,
        data: {
          availableSlots: query.rows,
          bookedTimes
        }
      });

    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available slots'
      });
    }
  },

  // Cancel a tour
  cancelTour: async (req, res) => {
    //  const pool = await pool.connect();
    try {
      await pool.query('BEGIN');

      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      // Get tour details
      const tourQuery = await pool.query(
        `SELECT t.*, p.street_address, u.email as seller_email
         FROM property_tours t
         JOIN properties p ON t.property_id = p.id
         JOIN users u ON p.seller_id = u.id
         WHERE t.id = $1`,
        [id]
      );

      if (tourQuery.rows.length === 0) {
        throw new Error('Tour not found');
      }

      const tour = tourQuery.rows[0];

      // Update tour status
      await pool.query(
        `UPDATE property_tours 
         SET status = 'cancelled', 
             cancelled_at = NOW(), 
             cancelled_by = $2,
             cancellation_reason = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [id, userId ? 'buyer' : 'system', reason]
      );

      // Update availability slot
      await pool.query(
        `UPDATE tour_availability 
         SET current_bookings = GREATEST(0, current_bookings - 1)
         WHERE property_id = $1 
         AND available_date = $2
         AND $3::time BETWEEN start_time AND end_time`,
        [tour.property_id, tour.tour_date, tour.tour_time]
      );

      await pool.query('COMMIT');

      // Send cancellation notifications
      // await sendEmail({
      //   to: tour.buyer_email,
      //   subject: 'Tour Cancelled',
      //   template: 'tourCancellation',
      //   data: {
      //     property: tour.street_address,
      //     date: tour.tour_date,
      //     time: tour.tour_time,
      //     reason
      //   }
      // });

      res.json({
        success: true,
        message: 'Tour cancelled successfully'
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Cancel tour error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel tour'
      });
    } finally {
      //pool.release();
    }
  },

  // Reschedule a tour
  rescheduleTour: async (req, res) => {
    //const pool = await pool.connect();
    try {
      await pool.query('BEGIN');

      const { id } = req.params;
      const { date, time } = req.body;

      // Check new slot availability
      const availabilityCheck = await pool.query(
        `SELECT t.property_id FROM property_tours t
         WHERE t.id = $1`,
        [id]
      );

      if (availabilityCheck.rows.length === 0) {
        throw new Error('Tour not found');
      }

      const propertyId = availabilityCheck.rows[0].property_id;

      // Check if new time slot is available
      const slotCheck = await pool.query(
        `SELECT * FROM tour_availability 
         WHERE property_id = $1 
         AND available_date = $2 
         AND $3::time BETWEEN start_time AND end_time 
         AND is_active = true 
         AND current_bookings < max_tours`,
        [propertyId, date, time]
      );

      if (slotCheck.rows.length === 0) {
        throw new Error('New time slot is not available');
      }

      // Get old tour details
      const oldTour = await pool.query(
        `SELECT * FROM property_tours WHERE id = $1`,
        [id]
      );

      // Update old availability slot
      await pool.query(
        `UPDATE tour_availability 
         SET current_bookings = GREATEST(0, current_bookings - 1)
         WHERE property_id = $1 
         AND available_date = $2
         AND $3::time BETWEEN start_time AND end_time`,
        [propertyId, oldTour.rows[0].tour_date, oldTour.rows[0].tour_time]
      );

      // Update tour with new date/time
      await pool.query(
        `UPDATE property_tours 
         SET tour_date = $2, 
             tour_time = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [id, date, time]
      );

      // Update new availability slot
      await pool.query(
        `UPDATE tour_availability 
         SET current_bookings = current_bookings + 1
         WHERE property_id = $1 
         AND available_date = $2
         AND $3::time BETWEEN start_time AND end_time`,
        [propertyId, date, time]
      );

      // Update reminders
      const tourDateTime = new Date(`${date}T${time}`);
      const reminderTime = new Date(tourDateTime.getTime() - 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE tour_reminders 
         SET scheduled_for = $2, status = 'pending', sent_at = NULL
         WHERE tour_id = $1`,
        [id, reminderTime]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Tour rescheduled successfully',
        data: {
          newDate: date,
          newTime: time
        }
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Reschedule tour error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reschedule tour'
      });
    } finally {
      //pool.release();
    }
  },

  // Submit feedback after tour
  submitFeedback: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        rating,
        interestLevel,
        propertyCondition,
        likedFeatures,
        dislikedFeatures,
        comments,
        attended,
        nextSteps
      } = req.body;

      // Check if feedback already exists
      const existingFeedback = await pool.query(
        `SELECT id FROM tour_feedback WHERE tour_id = $1`,
        [id]
      );

      if (existingFeedback.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Feedback already submitted for this tour'
        });
      }

      // Insert feedback
      const result = await pool.query(
        `INSERT INTO tour_feedback 
         (tour_id, rating, interest_level, property_condition, 
          liked_features, disliked_features, comments, attended, next_steps)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, rating, interestLevel, propertyCondition,
          likedFeatures, dislikedFeatures, comments, attended, nextSteps]
      );

      // Update tour status
      await pool.query(
        `UPDATE property_tours 
         SET status = 'completed', updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      res.json({
        success: true,
        message: 'Thank you for your feedback',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit feedback'
      });
    }
  },

  // Get upcoming tours for a user
  getUpcomingTours: async (req, res) => {
    try {
      const userEmail = req.user.email;

      const query = await pool.query(
        `SELECT 
          t.*,
          p.street_address,
          p.city,
          p.state,
          p.zip_code,
          p.listing_price,
          p.images
         FROM property_tours t
         JOIN properties p ON t.property_id = p.id
         WHERE t.buyer_email = $1
         AND t.status IN ('scheduled', 'confirmed')
         AND t.tour_date >= CURRENT_DATE
         ORDER BY t.tour_date, t.tour_time`,
        [userEmail]
      );

      res.json({
        success: true,
        data: query.rows
      });

    } catch (error) {
      console.error('Get upcoming tours error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming tours'
      });
    }
  },

  // Set availability for property tours (seller function)
  setAvailability: async (req, res) => {
    //  const pool = await pool.connect();
    try {
      await pool.query('BEGIN');

      const { propertyId, availability } = req.body;
      const userId = req.user.id;

      // Verify property ownership
      const propertyCheck = await pool.query(
        `SELECT id FROM properties WHERE id = $1 AND seller_id = $2`,
        [propertyId, userId]
      );

      if (propertyCheck.rows.length === 0) {
        throw new Error('Property not found or unauthorized');
      }

      // Insert availability slots
      for (const slot of availability) {
        await pool.query(
          `INSERT INTO tour_availability 
           (property_id, available_date, start_time, end_time, max_tours)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (property_id, available_date, start_time) 
           DO UPDATE SET 
             end_time = EXCLUDED.end_time,
             max_tours = EXCLUDED.max_tours,
             is_active = true`,
          [propertyId, slot.date, slot.startTime, slot.endTime, slot.maxTours || 1]
        );
      }

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Availability set successfully'
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Set availability error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to set availability'
      });
    } finally {
      //pool.release();
    }
  },

  // Confirm tour via confirmation code
  confirmTour: async (req, res) => {
    try {
      const { confirmationCode } = req.params;

      const result = await pool.query(
        `UPDATE property_tours 
         SET status = 'confirmed', updated_at = NOW()
         WHERE confirmation_code = $1
         RETURNING *`,
        [confirmationCode]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Invalid confirmation code'
        });
      }

      res.json({
        success: true,
        message: 'Tour confirmed successfully',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Confirm tour error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm tour'
      });
    }
  },

  // Get tour history for a user
  getTourHistory: async (req, res) => {
    try {
      const userEmail = req.user.email;

      const query = await pool.query(
        `SELECT 
          t.*,
          p.street_address,
          p.city,
          p.state,
          tf.rating,
          tf.interest_level,
          tf.next_steps
         FROM property_tours t
         JOIN properties p ON t.property_id = p.id
         LEFT JOIN tour_feedback tf ON t.id = tf.tour_id
         WHERE t.buyer_email = $1
         AND (t.tour_date < CURRENT_DATE OR t.status IN ('completed', 'cancelled'))
         ORDER BY t.tour_date DESC, t.tour_time DESC
         LIMIT 50`,
        [userEmail]
      );

      res.json({
        success: true,
        data: query.rows
      });

    } catch (error) {
      console.error('Get tour history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tour history'
      });
    }
  },

  // Get property tours for seller
  getPropertyTours: async (req, res) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user.id;

      // Verify property ownership
      const propertyCheck = await pool.query(
        `SELECT id FROM properties WHERE id = $1 AND seller_id = $2`,
        [propertyId, userId]
      );

      if (propertyCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const query = await pool.query(
        `SELECT 
          t.*,
          tf.rating,
          tf.interest_level,
          tf.next_steps,
          tf.comments as feedback_comments
         FROM property_tours t
         LEFT JOIN tour_feedback tf ON t.id = tf.tour_id
         WHERE t.property_id = $1
         ORDER BY t.tour_date DESC, t.tour_time DESC`,
        [propertyId]
      );

      res.json({
        success: true,
        data: query.rows
      });

    } catch (error) {
      console.error('Get property tours error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property tours'
      });
    }
  },

  // Get tour details
  getTourDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const userEmail = req.user.email;

      const query = await pool.query(
        `SELECT 
          t.*,
          p.street_address,
          p.city,
          p.state,
          p.zip_code,
          p.listing_price,
          p.images,
          p.description,
          tf.rating,
          tf.interest_level,
          tf.comments as feedback_comments,
          tf.next_steps
         FROM property_tours t
         JOIN properties p ON t.property_id = p.id
         LEFT JOIN tour_feedback tf ON t.id = tf.tour_id
         WHERE t.id = $1 AND t.buyer_email = $2`,
        [id, userEmail]
      );

      if (query.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tour not found'
        });
      }

      res.json({
        success: true,
        data: query.rows[0]
      });

    } catch (error) {
      console.error('Get tour details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tour details'
      });
    }
  }
};

module.exports = tourController;