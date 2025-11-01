const { Pool } = require('pg');

// Database connection pool
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});



const savedPropertyController = {
    // Save a property
    saveProperty: async (req, res) => {

        try {
            const { propertyId } = req.body;

            const userId  = req.user.userId;


          //  console.log("user_d",req);


            //  res.status(201).json({
            //     message: 'Property saved successfully',
            //     user : req.user,
            // });



            // Check if property exists
            const propertyCheck = await pool.query(
                'SELECT id FROM properties WHERE id = $1',
                [propertyId]
            );

            if (propertyCheck.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Property not found' });
            }

            // // Check if user exists
            // const userCheck = await pool.query(
            //     `SELECT id FROM users WHERE id = $1`,
            //     [userId]
            // );

  

            // if (userCheck.rows.length === 0) {
            //     //await pool.query('ROLLBACK');
            //     return res.status(404).json({ message: 'User not found' });
            // }

            // Check if already saved
            const existingCheck = await pool.query(
                'SELECT id FROM property_saved WHERE buyer_id = $1 AND property_id = $2',
                [userId, propertyId]
            );

            if (existingCheck.rows.length > 0) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ message: 'Property already saved' });
            }

            // Insert new saved property
            const insertResult = await pool.query(
                `INSERT INTO property_saved (buyer_id, property_id, created_at) 
         VALUES ($1, $2, NOW()) 
         RETURNING id, buyer_id, property_id, created_at`,
                [userId, propertyId]
            );

            await pool.query('COMMIT');

            res.status(201).json({
                message: 'Property saved successfully',
                propertyId,
                savedProperty: insertResult.rows[0]
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Error saving property:', error);

            // Handle unique constraint violation
            if (error.code === '23505') {
                return res.status(400).json({ message: 'Property already saved' });
            }

            res.status(500).json({ message: 'Internal server error' });
        } finally {
            //pool.release();
        }
    },

    // Unsave a property
    unsaveProperty: async (req, res) => {
     
        try {
            const { propertyId } = req.params;
            const  userId  = req.user.userId;

            const result = await pool.query(
                'DELETE FROM property_saved WHERE buyer_id = $1 AND property_id = $2',
                [userId, propertyId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Saved property not found' });
            }

            res.status(200).json({
                message: 'Property unsaved successfully',
                propertyId
            });
        } catch (error) {
            console.error('Error unsaving property:', error);
            res.status(500).json({ message: 'Internal server error' });
        } finally {
           // client.release();
        }
    },

    // Get all saved properties for a user
    getUserSavedProperties: async (req, res) => {

        try {
            const userId = req.user.userId;
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            // Check if user exists
            const userCheck = await pool.query(
                'SELECT id FROM users WHERE id = $1',
                [userId]
            );



            if (userCheck.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get total count
            const countResult = await pool.query(
                'SELECT COUNT(*) FROM property_saved WHERE buyer_id = $1',
                [userId]
            );
            const total = parseInt(countResult.rows[0].count);

            // Get saved properties with property details
            const savedProperties = await pool.query(
                `SELECT 
          sp.id as saved_id,
          sp.created_at,
          p.*
         FROM property_saved sp
         JOIN properties p ON sp.property_id = p.id
         WHERE sp.buyer_id = $1
         ORDER BY sp.created_at DESC
         LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );

            res.status(200).json({
                savedProperties: savedProperties.rows,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                total
            });
        } catch (error) {
            console.error('Error fetching saved properties:', error);
            res.status(500).json({ message: 'Internal server error' });
        } finally {
            //pool.release();
        }
    },

    // Check if property is saved
    checkIfSaved: async (req, res) => {
        //const client = await pool.connect();
        try {
            const { propertyId, userId } = req.params;

            const result = await pool.query(
                'SELECT id FROM property_saved WHERE buyer_id = $1 AND property_id = $2',
                [userId, propertyId]
            );

            res.status(200).json({
                isSaved: result.rows.length > 0
            });
        } catch (error) {
            console.error('Error checking saved property:', error);
            res.status(500).json({ message: 'Internal server error' });
        } finally {
            //client.release();
        }
    },

    // Get saved property IDs for a user (lightweight endpoint for frontend)
    getUserSavedPropertyIds: async (req, res) => {
        //const client = await pool.connect();
        try {
            const { userId } = req.params;

            const result = await pool.query(
                'SELECT property_id FROM property_saved WHERE buyer_id = $1',
                [userId]
            );

            const propertyIds = result.rows.map(row => row.property_id);

            res.status(200).json(propertyIds);
        } catch (error) {
            console.error('Error fetching saved property IDs:', error);
            res.status(500).json({ message: 'Internal server error' });
        } finally {
           // client.release();
        }
    }
};

module.exports = savedPropertyController;