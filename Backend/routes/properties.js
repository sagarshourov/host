// backend/routes/properties.js
// Property management routes for creating, updating, searching listings

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

// GET /api/properties - Get all properties (with search and filtering)
router.get('/', async (req, res) => {
    try {
        console.log('Fetching properties with query:', req.query);  // ADD THIS

        const {
            city,
            state,
            minPrice,
            maxPrice,
            minBedrooms,
            maxBedrooms,
            minBathrooms,
            maxBathrooms,
            propertyType,
            status = 'active',
            limit = 50,
            offset = 0
        } = req.query;

        let query = `
            SELECT p.*, u.first_name, u.last_name, u.phone, u.email
            FROM properties p
            JOIN users u ON p.seller_id = u.id
            WHERE p.status = $1
        `;

        const queryParams = [status];
        let paramCount = 1;

        // Add filters
        if (city) {
            paramCount++;
            query += ` AND LOWER(p.city) = LOWER($${paramCount})`;
            queryParams.push(city);
        }
        if (state) {
            paramCount++;
            query += ` AND UPPER(p.state) = UPPER($${paramCount})`;
            queryParams.push(state);
        }
        if (minPrice) {
            paramCount++;
            query += ` AND p.list_price >= $${paramCount}`;
            queryParams.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            paramCount++;
            query += ` AND p.list_price <= $${paramCount}`;
            queryParams.push(parseFloat(maxPrice));
        }
        if (minBedrooms) {
            paramCount++;
            query += ` AND p.bedrooms >= $${paramCount}`;
            queryParams.push(parseInt(minBedrooms));
        }
        if (maxBedrooms) {
            paramCount++;
            query += ` AND p.bedrooms <= $${paramCount}`;
            queryParams.push(parseInt(maxBedrooms));
        }
        if (minBathrooms) {
            paramCount++;
            query += ` AND p.bathrooms >= $${paramCount}`;
            queryParams.push(parseFloat(minBathrooms));
        }
        if (maxBathrooms) {
            paramCount++;
            query += ` AND p.bathrooms <= $${paramCount}`;
            queryParams.push(parseFloat(maxBathrooms));
        }
        if (propertyType) {
            paramCount++;
            query += ` AND p.property_type = $${paramCount}`;
            queryParams.push(propertyType);
        }

        paramCount++;
        query += ` ORDER BY p.listed_date DESC LIMIT $${paramCount}`;
        queryParams.push(parseInt(limit));

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        queryParams.push(parseInt(offset));

        const result = await pool.query(query, queryParams);

        // Get photos for each property
        for (let property of result.rows) {
            const photosResult = await pool.query(
                'SELECT photo_url, is_main, photo_order FROM property_photos WHERE property_id = $1 ORDER BY photo_order',
                [property.id]
            );
            property.photos = photosResult.rows;
        }

        res.json({
            success: true,
            properties: result.rows,
            total: result.rowCount,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Search properties error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/properties/:id - Get single property by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT p.*, u.first_name, u.last_name, u.phone, u.email
            FROM properties p
            JOIN users u ON p.seller_id = u.id
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Property not found'
            });
        }

        const property = result.rows[0];

        // Get photos
        const photosResult = await pool.query(
            'SELECT photo_url, is_main_photo, photo_order FROM property_photos WHERE property_id = $1 ORDER BY photo_order',
            [id]
        );
        property.photos = photosResult.rows;

        // Get comparable sales (placeholder for now)
        property.comparableSales = []; // TODO: Implement real comps data

        res.json({
            success: true,
            property: {
                ...property,
                seller: {
                    firstName: property.first_name,
                    lastName: property.last_name,
                    phone: property.phone,
                    email: property.email
                }
            }
        });

    } catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/properties - Create new property listing (FIXED TO MATCH YOUR DATABASE)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            // Basic property info
            streetAddress,
            city,
            state,
            zipCode,
            listPrice,
            bedrooms,
            bathrooms,
            squareFeet,
            lotSize,
            propertyType,
            yearBuilt,
            description,

            // Property system fields (MATCHING YOUR DATABASE COLUMNS)
            hvacType,           // Maps to hvac_type
            hvacInstallYear,    // Maps to hvac_install_year (NOT date)
            waterHeaterType,    // Maps to water_heater_type
            waterHeaterYear,    // Maps to water_heater_year (NOT date)
            roofMaterial,       // Maps to roof_material (NOT roof_type)
            roofYear,           // Maps to roof_year (NOT roof_replacement_date)

            // Septic system
            hasSeptic,          // Maps to has_septic
            septicType,         // Maps to septic_type
            septicLastPumped,   // Maps to septic_last_pumped (NOT serviced)

            // Solar panels
            hasSolar,           // Maps to has_solar
            solarType,          // Maps to solar_type (NOT ownership)
            solarInstallYear,   // Maps to solar_install_year
            solarMonthlySavings,// Maps to solar_monthly_savings

            // Property condition
            propertyCondition,  // Maps to property_condition
            majorRepairsNeeded, // Maps to major_repairs_needed

            // Other existing fields
            propertyTaxAnnual,
            hoaFeesMonthly,
            garageSpaces,
            hasPool,
            hasFireplace,
            allowMessages,
            minimumOffer
        } = req.body;

        // Validate required fields
        if (!streetAddress || !city || !state || !zipCode || !listPrice ||
            !bedrooms || !bathrooms || !squareFeet || !propertyType || !description) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Insert property with CORRECT column names
        const result = await pool.query(`
            INSERT INTO properties (
                seller_id, street_address, city, state, zip_code, list_price,
                bedrooms, bathrooms, square_feet, lot_size, property_type,
                year_built, description,
                hvac_type, hvac_install_year,
                water_heater_type, water_heater_year,
                roof_material, roof_year,
                has_septic, septic_type, septic_last_pumped,
                has_solar, solar_type, solar_install_year, solar_monthly_savings,
                property_condition, major_repairs_needed,
                property_tax_annual, hoa_fees_monthly, 
                garage_spaces, has_pool, has_fireplace,
                allow_messages, minimum_offer,
                status, listed_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                $27, $28, $29, $30, $31, $32, $33, $34, $35,
                'active', CURRENT_TIMESTAMP
            ) RETURNING *
        `, [
            req.user.userId, // seller_id from auth token
            streetAddress, city, state, zipCode, listPrice,
            bedrooms, bathrooms, squareFeet, lotSize || null, propertyType,
            yearBuilt || null, description,
            hvacType || null, hvacInstallYear || null,
            waterHeaterType || null, waterHeaterYear || null,
            roofMaterial || null, roofYear || null,
            hasSeptic || false, septicType || null, septicLastPumped || null,
            hasSolar || false, solarType || null, solarInstallYear || null, solarMonthlySavings || null,
            propertyCondition || 'move-in-ready', majorRepairsNeeded || null,
            propertyTaxAnnual || null, hoaFeesMonthly || null,
            garageSpaces || 0, hasPool || false, hasFireplace || false,
            allowMessages !== false, minimumOffer || null
        ]);

        const property = result.rows[0];

        res.json({
            success: true,
            message: 'Property listed successfully',
            property: property
        });

    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create property listing',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/properties/valuation - Get AI home valuation with caching
router.post('/valuation', async (req, res) => {
    try {
        const {
            address,
            city,
            state,
            zipCode,
            bedrooms,
            bathrooms,
            squareFeet,
            yearBuilt,
            propertyType,
            propertyId // Optional, for saved properties
        } = req.body;

        // Check for cached valuation if propertyId provided
        if (propertyId) {
            const cachedResult = await pool.query(
                `SELECT * FROM property_valuations 
                 WHERE property_id = $1 AND expires_at > NOW() 
                 ORDER BY created_at DESC LIMIT 1`,
                [propertyId]
            );

            if (cachedResult.rows.length > 0) {
                const cached = cachedResult.rows[0];
                return res.json({
                    success: true,
                    cached: true,
                    valuation: {
                        estimatedValue: parseFloat(cached.estimated_value),
                        minValue: parseFloat(cached.min_value),
                        maxValue: parseFloat(cached.max_value),
                        pricePerSqft: parseFloat(cached.price_per_sqft),
                        data: cached.valuation_data
                    }
                });
            }
        }

        // Calculate new valuation
        const basePrice = 175; // Base price per sq ft for Atlantic County, NJ
        let pricePerSqFt = basePrice;

        // Property type adjustments
        if (propertyType === 'condo') pricePerSqFt *= 0.85;
        if (propertyType === 'townhouse') pricePerSqFt *= 0.9;
        if (propertyType === 'multi-family') pricePerSqFt *= 1.1;

        // Age adjustments
        const currentYear = new Date().getFullYear();
        const age = currentYear - (yearBuilt || 1990);
        if (age < 5) pricePerSqFt *= 1.15;
        else if (age < 10) pricePerSqFt *= 1.08;
        else if (age > 30) pricePerSqFt *= 0.85;
        else if (age > 50) pricePerSqFt *= 0.75;

        // Bedroom/bathroom multiplier
        const bedBathMultiplier = 1 + ((bedrooms - 3) * 0.05) + ((bathrooms - 2) * 0.03);
        pricePerSqFt *= bedBathMultiplier;

        // Location adjustments for Atlantic County, NJ
        const locationMultipliers = {
            'Atlantic City': 0.9,
            'Margate City': 1.3,
            'Ventnor City': 1.15,
            'Longport': 1.4,
            'Ocean City': 1.35,
            'Egg Harbor Township': 1.0,
            'Galloway': 0.95,
            'Hammonton': 0.85
        };

        const cityMultiplier = locationMultipliers[city] || 1.0;
        pricePerSqFt *= cityMultiplier;

        // Calculate final values
        const estimatedValue = Math.round(squareFeet * pricePerSqFt);
        const minValue = Math.round(estimatedValue * 0.9);
        const maxValue = Math.round(estimatedValue * 1.1);

        // Store in cache if propertyId provided
        if (propertyId) {
            await pool.query(
                `INSERT INTO property_valuations 
                 (property_id, estimated_value, min_value, max_value, price_per_sqft, valuation_data)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    propertyId,
                    estimatedValue,
                    minValue,
                    maxValue,
                    pricePerSqFt,
                    JSON.stringify({
                        basePrice,
                        adjustments: {
                            propertyType: propertyType,
                            age: age,
                            location: city,
                            cityMultiplier: cityMultiplier
                        }
                    })
                ]
            );
        }

        res.json({
            success: true,
            cached: false,
            valuation: {
                estimatedValue,
                minValue,
                maxValue,
                pricePerSqft: pricePerSqFt,
                data: {
                    basePrice,
                    adjustments: {
                        propertyType,
                        age,
                        location: city,
                        cityMultiplier
                    }
                }
            }
        });

    } catch (error) {
        console.error('Valuation error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate valuation' });
    }
});

// PUT /api/properties/:id - Update property
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user owns this property
        const ownerResult = await pool.query(
            'SELECT seller_id FROM properties WHERE id = $1',
            [id]
        );

        if (ownerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        if (ownerResult.rows[0].seller_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Build dynamic update query based on provided fields
        const allowedFields = [
            'list_price', 'description', 'status',
            'hvac_type', 'hvac_install_year',
            'water_heater_type', 'water_heater_year',
            'roof_material', 'roof_year',
            'has_septic', 'septic_type', 'septic_last_pumped',
            'has_solar', 'solar_type', 'solar_install_year', 'solar_monthly_savings',
            'property_condition', 'major_repairs_needed',
            'property_tax_annual', 'hoa_fees_monthly',
            'allow_messages', 'minimum_offer'
        ];

        const updates = [];
        const values = [];
        let paramCount = 1;

        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                updates.push(`${field} = $${paramCount}`);
                values.push(req.body[field]);
                paramCount++;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }


        values.push(id); // Add property ID as last parameter
        const updateQuery = `
            UPDATE properties 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, values);

        res.json({
            success: true,
            message: 'Property updated successfully',
            property: result.rows[0]
        });

    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update property'
        });
    }
});

// GET /api/properties/seller/my-listings - Get seller's properties
router.get('/seller/my-listings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   COUNT(o.id) as offer_count,
                   (SELECT photo_url FROM property_photos WHERE property_id = p.id AND is_main = TRUE LIMIT 1) as main_photo
            FROM properties p
            LEFT JOIN offers o ON p.id = o.property_id AND o.status = 'pending'
            WHERE p.seller_id = $1
            GROUP BY p.id
            ORDER BY p.listed_date DESC
        `, [1]);

        res.json({
            success: true,
            properties: result.rows,  // Always use .rows to get the actual data
        });


    } catch (error) {
        console.error('Get seller properties error:', error);
        res.status(500).json({ success: false, error: error });
    }
});

// DELETE /api/properties/:id - Delete property
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user owns this property
        const ownerResult = await pool.query(
            'SELECT seller_id FROM properties WHERE id = $1',
            [id]
        );

        if (ownerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        if (ownerResult.rows[0].seller_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this property' });
        }

        // Delete property (cascade will handle related records)
        await pool.query('DELETE FROM properties WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Property deleted successfully'
        });

    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;