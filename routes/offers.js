// backend/routes/offers.js
// Offer management routes for submitting, accepting, rejecting offers

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// POST /api/offers - Submit an offer
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            propertyId,
            offerAmount,
            financingType,
            buyerMessage,
            inspectionContingency,
            financingContingency,
            appraisalContingency
        } = req.body;

        // Validate required fields
        if (!propertyId || !offerAmount) {
            return res.status(400).json({
                success: false,

                error: 'Property ID and offer amount are required'
            });
        }

        // Get property details to validate offer
        const propertyResult = await pool.query(
            'SELECT list_price, minimum_offer, seller_id, allow_messages FROM properties WHERE id = $1 AND status = $2',
            [propertyId, 'active']
        );

        if (propertyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Property not found or not available'
            });
        }

        const property = propertyResult.rows[0];

        // Check if buyer is trying to buy their own property
        if (property.seller_id === req.user.userId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot submit offer on your own property'
            });
        }

        // Validate minimum offer (50% rule)
        const minimumOffer = property.minimum_offer || property.list_price * 0.5;
        if (offerAmount < minimumOffer) {
            return res.status(400).json({
                success: false,
                error: `Offer must be at least $${minimumOffer.toLocaleString()}`
            });
        }

        // Create the offer
        const result = await pool.query(`
            INSERT INTO offers (
                property_id, buyer_id, offer_amount, financing_type, buyer_message, inspection_contingency, financing_contingency, appraisal_contingency ,seller_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8 , $9
            ) RETURNING *
        `, [
            propertyId, req.user.userId,  offerAmount, financingType, buyerMessage, inspectionContingency !== false, financingContingency !== false, appraisalContingency !== false , property.seller_id
        ]);

        const offer = result.rows[0];

        // Create message if provided and allowed
        if (buyerMessage && property.allow_messages) {
            await pool.query(`
                INSERT INTO messages (sender_id, recipient_id, property_id, offer_id, message_text)
                VALUES ($1, $2, $3, $4, $5)
            `, [req.user.userId, property.seller_id, propertyId, offer.id, buyerMessage]);
        }

        res.json({
            success: true,
            message: 'Offer submitted successfully',
            offer: offer
        });

    } catch (error) {
        console.error('Submit offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


const allOffers = async (propertyId, userId) => {

    try {
        // Verify user owns this property
        const propertyResult = await pool.query(
            'SELECT seller_id FROM properties WHERE id = $1',
            [propertyId]
        );

        if (propertyResult.rows.length === 0) {
            return { success: false, error: 'Property not found' };
        }

        if (propertyResult.rows[0].seller_id !== userId) {
            return { success: false, error: 'Not authorized to view offers for this property' };
        }

        const result = await pool.query(`
            SELECT o.*, u.first_name, u.last_name, u.email, u.phone, u.pre_approval_amount
            FROM offers o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.property_id = $1
            ORDER BY o.created_at DESC
        `, [propertyId]);

        // Calculate offer strength for each offer
        const propertyPriceResult = await pool.query('SELECT street_address,city,state,zip_code,list_price FROM properties WHERE id = $1', [propertyId]);
        const listPrice = propertyPriceResult.rows[0]?.list_price || 0;
        const streetAddress = propertyPriceResult.rows[0]?.street_address || 0;
        const city = propertyPriceResult.rows[0]?.city || 0;
        const state = propertyPriceResult.rows[0]?.state || 0;
        const zip_code = propertyPriceResult.rows[0]?.zip_code || 0;

        const offersWithStrength = result.rows.map(offer => {
            let strength = 'weak';
            const offerPercentage = (offer.offer_amount / listPrice) * 100;

            if (offerPercentage >= 95) strength = 'strong';
            else if (offerPercentage >= 85) strength = 'fair';

            return {
                ...offer,
                strength,
                offerPercentage: offerPercentage.toFixed(1),
                streetAddress: streetAddress,
                zip_code: zip_code,
                state: state,
                city: city,

                buyer: {
                    firstName: offer.first_name,
                    lastName: offer.last_name,
                    email: offer.email,
                    phone: offer.phone,
                    preApprovalAmount: offer.pre_approval_amount,
                    preApprovalLender: offer.lender_name
                }
            };
        });

        //console.log("all", offersWithStrength);

        return offersWithStrength;



    } catch (error) {
        console.error('Get property offers error:', error);

        return 500;
        //res.status(500).json({ success: false, error: 'Internal server error' });
    }


}




// GET /api/offers/property/:propertyId - Get all offers for a property (for sellers)
router.get('/property/:propertyId', authenticateToken, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user.userId; // ✅ fixed destructuring

        const allOfferrs = await allOffers(propertyId, userId); // ✅ fixed param order + await

        res.json({
            success: true,
            offers: allOfferrs
        });
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// GET /api/offers/buyer/my-offers - Get buyer's offers
router.get('/buyer/my-offers', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.*,t.id as trans_id, p.street_address, p.city, p.state, p.list_price,
                   (SELECT photo_url FROM property_photos WHERE property_id = p.id AND is_main = TRUE LIMIT 1) as main_photo
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            JOIN transactions t ON t.offer_id = o.id
            WHERE o.buyer_id = $1
            ORDER BY o.id DESC
        `, [req.user.userId]);

        res.json({
            success: true,
            offers: result.rows
        });

    } catch (error) {
        console.error('Get buyer offers error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/offers/:offerId/respond - Respond to an offer (accept, reject, counter)
router.post('/:offerId/respond', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;
        const { action, counterAmount, sellerResponse } = req.body;

        if (!['accepted', 'rejected', 'countered'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be accepted, rejected, or countered'
            });
        }

        // Get offer details
        const offerResult = await pool.query(`
            SELECT o.*, p.seller_id
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            WHERE o.id = $1
        `, [offerId]);

        if (offerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Offer not found' });
        }

        const offer = offerResult.rows[0];

        // Check if user is authorized to respond to this offer
        if (offer.seller_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to respond to this offer' });
        }

        let updateQuery;
        let updateParams;

        if (action === 'accepted') {
            updateQuery = `
                UPDATE offers 
                SET status = 'accepted', seller_response = $1, updated_at = NOW(), accepted_date = NOW()
                WHERE id = $2
                RETURNING *
            `;
            updateParams = [sellerResponse, offerId];











        } else if (action === 'rejected') {
            updateQuery = `
                UPDATE offers 
                SET status = 'rejected', seller_response = $1, rejected_date = NOW()
                WHERE id = $2
                RETURNING *
            `;
            updateParams = [sellerResponse, offerId];

        } else { // counter
            if (!counterAmount || counterAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Counter amount is required for counter offers'
                });
            }

            updateQuery = `
                UPDATE offers 
                SET status = 'countered', counter_amount = $1, seller_response = $2, counter_date = NOW()
                WHERE id = $3
                RETURNING *
            `;
            updateParams = [counterAmount, sellerResponse, offerId];
        }

        const result = await pool.query(updateQuery, updateParams);

        if (action === 'accepted') {
            // Mark all other pending offers as rejected
            await pool.query(`
                UPDATE offers 
                SET status = 'rejected', seller_response = 'Property sold to another buyer'
                WHERE property_id = $1 AND id != $2
            `, [offer.property_id, offerId]);





            if (result.rowCount > 0) {
                let offer = result.rows[0];

                console.error('Respond to offer error:', offer.property_id);


                const created_at = new Date();

                const inserttransactionQuery = `
  INSERT INTO transactions (
    offer_id, property_id, buyer_id, seller_id, buyer_agent_id, seller_agent_id,
    purchase_price, earnest_money_amount, closing_date, closing_location,
    earnest_money_status, selected_title_company_id, phone_verified, phone_verified_at,
    earnest_money_verified_at, earnest_money_step, transaction_status, inspection_period_days,
    inspection_start_date, inspection_end_date, inspection_completed, appraisal_contingency,
    appraisal_value, appraisal_completed, appraisal_date, financing_contingency, loan_amount,
    loan_type, down_payment_percentage, interest_rate, loan_officer_id, title_insurance_amount,
    closing_costs, homeowners_insurance_required, hoa_fees, offer_acceptance_date,
    created_at, updated_at, closed_at
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
    $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
    $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
    $31,$32,$33,$34,$35,$36,$37,$38,$39
  );
`;

                const InsertTransParams = [
                    offer.id,
                    offer.property_id,
                    offer.buyer_id,
                    offer.seller_id,
                    0,
                    0,
                    offer.offer_amount,
                    offer.earnest_money_amount,
                    offer.proposed_closing_date,
                    "",
                    "pending",
                    null,
                    false,
                    null,
                    null,
                    1,
                    "",
                    10,
                    null,
                    null,
                    false,
                    false,
                    offer.offer_amount,
                    false,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    false,
                    0,
                    null,
                    created_at,
                    created_at,
                    null
                ];






                const tran_result = await pool.query(
                    `SELECT EXISTS (
                            SELECT 1 FROM transactions
                            WHERE offer_id = $1 AND buyer_id = $2
                        ) AS exists;`,
                    [offerId, offer.buyer_id]
                );

                if (tran_result.rows[0].exists) {
                    console.log("Transaction already exists");
                } else {
                    const insert_result = await pool.query(inserttransactionQuery, InsertTransParams);


                    //      await pool.query(`
                    //     UPDATE offers 
                    //     SET transactions_id = $1
                    //     WHERE  id = $2
                    // `, [insert_result.rows[0].id, offerId]);

                    // console.error("transaction", insert_result);

                }

            }


        }


        // Create message for seller response
        if (sellerResponse) {
            await pool.query(`
                INSERT INTO messages (sender_id, recipient_id, property_id, offer_id, message_text)
                VALUES ($1, $2, $3, $4, $5)
            `, [req.user.userId, offer.buyer_id, offer.property_id, offerId, sellerResponse]);
        }

        let message;
        if (action === 'accepted') {
            message = 'Offer accepted! The buyer will be notified.';
        } else if (action === 'rejected') {
            message = 'Offer rejected. The buyer will be notified.';
        } else {
            message = `Counter offer submitted for $${counterAmount.toLocaleString()}. The buyer will be notified.`;
        }

        const allOfferrs = await allOffers(offer.property_id, req.user.userId);

        res.json({
            success: true,
            message,
            offers: allOfferrs
        });

    } catch (error) {
        console.error('Respond to offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/offers/:offerId - Get offer details
router.get('/:offerId', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;

        const result = await pool.query(`
            SELECT o.*, p.street_address, p.city, p.state, p.list_price, p.seller_id,
                   u.first_name, u.last_name, u.email, u.phone, u.pre_approval_amount
            FROM offers o
            JOIN properties p ON o.property_id = p.id
            JOIN users u ON o.buyer_id = u.id
            WHERE o.id = $1
        `, [offerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Offer not found' });
        }

        const offer = result.rows[0];

        // Check if user is authorized to view this offer
        if (offer.buyer_id !== req.user.userId && offer.seller_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to view this offer' });
        }

        res.json({
            success: true,
            offer: {
                ...offer,
                buyer: {
                    firstName: offer.first_name,
                    lastName: offer.last_name,
                    email: offer.email,
                    phone: offer.phone,
                    preApprovalAmount: offer.pre_approval_amount
                }
            }
        });

    } catch (error) {
        console.error('Get offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/offers/:offerId - Withdraw an offer (for buyers)
router.delete('/:offerId', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;

        // Get offer details
        const offerResult = await pool.query(
            'SELECT buyer_id, status FROM offers WHERE id = $1',
            [offerId]
        );

        if (offerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Offer not found' });
        }

        const offer = offerResult.rows[0];

        // Check if user is authorized to withdraw this offer
        if (offer.buyer_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to withdraw this offer' });
        }

        // Check if offer can be withdrawn
        if (offer.status !== 'pending' && offer.status !== 'countered') {
            return res.status(400).json({ success: false, error: 'Cannot withdraw an offer that has been accepted or rejected' });
        }

        // Mark offer as withdrawn
        await pool.query(
            'UPDATE offers SET status = $1, responded_at = NOW() WHERE id = $2',
            ['withdrawn', offerId]
        );

        res.json({
            success: true,
            message: 'Offer withdrawn successfully'
        });

    } catch (error) {
        console.error('Withdraw offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;