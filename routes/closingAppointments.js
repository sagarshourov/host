// routes/closingAppointments.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get closing appointment for a transaction
router.get('/transaction/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const appointment = await db.query(`
            SELECT ca.*, 
                   json_agg(cd) as documents
            FROM closing_appointments ca
            LEFT JOIN closing_documents cd ON cd.appointment_id = ca.id
            WHERE ca.transaction_id = $1
            GROUP BY ca.id
        `, [transactionId]);

        res.json({
            success: true,
            data: appointment.rows[0] || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Create/Update closing appointment
router.post('/', async (req, res) => {
    try {
        const {
            transaction_id,
            closing_time,
            location,
            documents
        } = req.body;

        // Check if appointment already exists
        const existingAppointment = await db.query(
            'SELECT id FROM closing_appointments WHERE transaction_id = $1',
            [transaction_id]
        );

        let appointmentId;
        
        if (existingAppointment.rows.length > 0) {
            // Update existing appointment
            appointmentId = existingAppointment.rows[0].id;
            await db.query(`
                UPDATE closing_appointments 
                SET closing_time = $1, location = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [closing_time, location, appointmentId]);
        } else {
            // Create new appointment
            const result = await db.query(`
                INSERT INTO closing_appointments (transaction_id, closing_time, location)
                VALUES ($1, $2, $3)
                RETURNING id
            `, [transaction_id, closing_time, location]);
            appointmentId = result.rows[0].id;
        }

        // Add documents if provided
        if (documents && documents.length > 0) {
            for (const doc of documents) {
                await db.query(`
                    INSERT INTO closing_documents (appointment_id, document_name, document_type, preview_available)
                    VALUES ($1, $2, $3, $4)
                `, [appointmentId, doc.name, doc.type, doc.previewAvailable || false]);
            }
        }

        res.json({
            success: true,
            message: 'Closing appointment saved successfully',
            appointmentId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update buyer confirmation and document status
router.patch('/:id/buyer-confirmation', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            buyer_confirmed,
            photo_id_uploaded,
            certified_check_uploaded,
            proof_insurance_uploaded
        } = req.body;

        await db.query(`
            UPDATE closing_appointments 
            SET buyer_confirmed = $1,
                buyer_photo_id_uploaded = $2,
                certified_check_uploaded = $3,
                proof_insurance_uploaded = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [
            buyer_confirmed,
            photo_id_uploaded,
            certified_check_uploaded,
            proof_insurance_uploaded,
            id
        ]);

        res.json({
            success: true,
            message: 'Buyer confirmation updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;