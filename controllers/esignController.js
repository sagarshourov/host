// controllers/esignController.js
const pool = require('../config/database');

// @desc    Create new esign document
// @route   POST /api/esign
// @access  Private (add authentication middleware as needed)
const createEsignDocument = async (req, res) => {

    try {
        const {
            letterDate,
            buyerType,
            buyerName,
            buyerAddress,
            buyerCity,
            buyerState,
            buyerZip,
            additionalBuyer,
            sellerType,
            sellerName,
            sellerAddress,
            sellerCity,
            sellerState,
            sellerZip,
            additionalSeller,
            propertyAddress,
            propertyCity,
            propertyState,
            legalDescLocation,
            legalDescription,
            propertyRestrictions,
            includeFixtures,
            includedItems,
            excludedItems,
            deedType,
            purchasePrice,
            depositAmount,
            possessionDate,
            requireFinancing,
            financingAmount,
            interestRate,
            financingYears,
            saleContingency,
            releaseConditions,
            conditionsDate,
            exclusiveNegotiation,
            standStill,
            standStillEndDate,
            additionalProvisions,
            userId,
            offerId
        } = req.body;

        const query = `
            INSERT INTO esign_documents (
                letter_date, buyer_type, buyer_name, buyer_address, buyer_city, buyer_state, buyer_zip,
                additional_buyer, seller_type, seller_name, seller_address, seller_city, seller_state,
                seller_zip, additional_seller, property_address, property_city, property_state,
                legal_desc_location, legal_description, property_restrictions, include_fixtures,
                included_items, excluded_items, deed_type, purchase_price, deposit_amount,
                possession_date, require_financing, financing_amount, interest_rate, financing_years,
                sale_contingency, release_conditions, conditions_date, exclusive_negotiation,
                stand_still, stand_still_end_date, additional_provisions, user_id , transactions_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
                $35, $36, $37, $38, $39, $40 , $41
            ) RETURNING *
        `;

        const values = [
            letterDate || null,
            buyerType || null,
            buyerName || null,
            buyerAddress || null,
            buyerCity || null,
            buyerState || null,
            buyerZip || null,
            additionalBuyer || false,
            sellerType || null,
            sellerName || null,
            sellerAddress || null,
            sellerCity || null,
            sellerState || null,
            sellerZip || null,
            additionalSeller || false,
            propertyAddress || null,
            propertyCity || null,
            propertyState || null,
            legalDescLocation || null,
            legalDescription || null,
            propertyRestrictions || null,
            includeFixtures || null,
            includedItems || null,
            excludedItems || null,
            deedType || null,
            purchasePrice || null,
            depositAmount || null,
            possessionDate || null,
            requireFinancing || null,
            financingAmount || null,
            interestRate || null,
            financingYears || null,
            saleContingency || null,
            releaseConditions || null,
            conditionsDate || null,
            exclusiveNegotiation || null,
            standStill || null,
            standStillEndDate || null,
            additionalProvisions || null,
            userId || null,
            offerId || null
        ];

        const result = await pool.query(query, values);

        const transactions_id = parseInt(offerId);


        await pool.query(
            `UPDATE task_value 
                       SET status = 'completed' 
                       WHERE task_id = $1 AND transactions_id = $2`,
            [11, transactions_id]
        ); // done esign


        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating esign document:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all esign documents
// @route   GET /api/esign
// @access  Private
const getAllEsignDocuments = async (req, res) => {
    try {
        const { userId } = req.query;

        let query = 'SELECT * FROM esign_documents';
        let values = [];

        if (userId) {
            query += ' WHERE user_id = $1 ORDER BY created_at DESC';
            values.push(userId);
        } else {
            query += ' ORDER BY created_at DESC';
        }

        const result = await pool.query(query, values);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching esign documents:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single esign document by ID
// @route   GET /api/esign/:id
// @access  Private
const getEsignDocumentById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM esign_documents WHERE transactions_id = $1';
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching esign document:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update esign document
// @route   PUT /api/esign/:id
// @access  Private
const updateEsignDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const docId = parseInt(id, 10);
        const {
            letterDate,
            buyerType,
            buyerName,
            buyerAddress,
            buyerCity,
            buyerState,
            buyerZip,
            additionalBuyer,
            sellerType,
            sellerName,
            sellerAddress,
            sellerCity,
            sellerState,
            sellerZip,
            additionalSeller,
            propertyAddress,
            propertyCity,
            propertyState,
            legalDescLocation,
            legalDescription,
            propertyRestrictions,
            includeFixtures,
            includedItems,
            excludedItems,
            deedType,
            purchasePrice,
            depositAmount,
            possessionDate,
            requireFinancing,
            financingAmount,
            interestRate,
            financingYears,
            saleContingency,
            releaseConditions,
            conditionsDate,
            exclusiveNegotiation,
            standStill,
            standStillEndDate,
            additionalProvisions,
            status,
            offerId
        } = req.body;

        const query = `
            UPDATE esign_documents SET
                letter_date = $1, buyer_type = $2, buyer_name = $3, buyer_address = $4,
                buyer_city = $5, buyer_state = $6, buyer_zip = $7, additional_buyer = $8,
                seller_type = $9, seller_name = $10, seller_address = $11, seller_city = $12,
                seller_state = $13, seller_zip = $14, additional_seller = $15,
                property_address = $16, property_city = $17, property_state = $18,
                legal_desc_location = $19, legal_description = $20, property_restrictions = $21,
                include_fixtures = $22, included_items = $23, excluded_items = $24,
                deed_type = $25, purchase_price = $26, deposit_amount = $27,
                possession_date = $28, require_financing = $29, financing_amount = $30,
                interest_rate = $31, financing_years = $32, sale_contingency = $33,
                release_conditions = $34, conditions_date = $35, exclusive_negotiation = $36,
                stand_still = $37, stand_still_end_date = $38, additional_provisions = $39,
                status = $40, transactions_id = $41
            WHERE id = $42
            RETURNING *
        `;

        const values = [
            letterDate || null,
            buyerType || null,
            buyerName || null,
            buyerAddress || null,
            buyerCity || null,
            buyerState || null,
            buyerZip || null,
            additionalBuyer || false,
            sellerType || null,
            sellerName || null,
            sellerAddress || null,
            sellerCity || null,
            sellerState || null,
            sellerZip || null,
            additionalSeller || false,
            propertyAddress || null,
            propertyCity || null,
            propertyState || null,
            legalDescLocation || null,
            legalDescription || null,
            propertyRestrictions || null,
            includeFixtures || null,
            includedItems || null,
            excludedItems || null,
            deedType || null,
            purchasePrice || null,
            depositAmount || null,
            possessionDate || null,
            requireFinancing || null,
            financingAmount || null,
            interestRate || null,
            financingYears || null,
            saleContingency || null,
            releaseConditions || null,
            conditionsDate || null,
            exclusiveNegotiation || null,
            standStill || null,
            standStillEndDate || null,
            additionalProvisions || null,
            status || 'draft',
            offerId || null,
            docId
        ];

        const result = await pool.query(query, values);

         //return res.status(404).json(result);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

       const transactions_id = parseInt(offerId);


        await pool.query(
            `UPDATE task_value 
                       SET status = 'completed' 
                       WHERE task_id = $1 AND transactions_id = $2`,
            [11, transactions_id]
        ); // done esign


        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating esign document:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete esign document
// @route   DELETE /api/esign/:id
// @access  Private
const deleteEsignDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const query = 'DELETE FROM esign_documents WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.status(200).json({ message: 'Document deleted successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Error deleting esign document:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createEsignDocument,
    getAllEsignDocuments,
    getEsignDocumentById,
    updateEsignDocument,
    deleteEsignDocument,
};