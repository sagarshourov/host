const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'real_estate_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

// GET /api/transactions - Get all transactions with filtering, sorting, and pagination
router.get('/transactions', async (req, res) => {
    const {
        page = 1,
        limit = 10,
        buyer_name,
        property_city,
        status,
        sortColumn = 'created_at',
        sortDirection = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    const params = [];
    let paramCounter = 0;

    whereConditions.push(`o.status = 'accepted'`);

    if (buyer_name) {
        paramCounter++;
        whereConditions.push(`b.first_name ILIKE $${paramCounter}`);
        params.push(`%${buyer_name}%`);
    }

    if (property_city) {
        paramCounter++;
        whereConditions.push(`p.city ILIKE $${paramCounter}`);
        params.push(`%${property_city}%`);
    }

    if (status) {
        paramCounter++;
        whereConditions.push(`o.status = $${paramCounter}`);
        params.push(status);
    }

    const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['created_at', 'offer_amount', 'status', 'property'];
    const validSortColumn = allowedSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
    const validSortDirection = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Add LIMIT and OFFSET parameters
    paramCounter++;
    const limitParam = `$${paramCounter}`;
    params.push(limit);

    paramCounter++;
    const offsetParam = `$${paramCounter}`;
    params.push(offset);

    const transactionsQuery = `
    SELECT 
        o.id,
        p.street_address as property,
        p.property_type,
        b.first_name as buyer,
        s.first_name as seller,
        o.offer_amount,
        o.status,
        o.created_at as created_date,
        
      
        COALESCE(progress_calc.completed_steps, 0) as completed_steps,
        COALESCE(progress_calc.total_steps, 0) as total_steps,
        COALESCE(progress_calc.progress_percentage, 0) as progress_percentage,
        
        COUNT(*) OVER() as total_count
    FROM offers o
    LEFT JOIN properties p ON o.property_id = p.id
    LEFT JOIN users b ON o.buyer_id = b.id
    LEFT JOIN users s ON p.seller_id = s.id
    

    LEFT JOIN (
        WITH step_completion AS (
            SELECT 
                tv.transactions_id,
 
                BOOL_AND(tv.status = 'completed') as step_completed
            FROM task_value tv
            JOIN tasks t ON tv.task_id = t.id
            GROUP BY tv.transactions_id
        )
        SELECT 
            transactions_id,
            COUNT(CASE WHEN step_completed THEN 1 END) as completed_steps,
            COUNT(*) as total_steps,
            ROUND(
                (COUNT(CASE WHEN step_completed THEN 1 END)::DECIMAL / 
                 NULLIF(COUNT(*), 0) * 100), 0
            ) as progress_percentage
        FROM step_completion
        GROUP BY transactions_id
    ) progress_calc ON o.id = progress_calc.transactions_id
    
    ${whereClause}
    ORDER BY o.${validSortColumn} ${validSortDirection}
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

    const result = await db.query(transactionsQuery, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
        success: true,
        data: result.rows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

// GET /api/transactions/:id - Get single transaction details
router.get('/transactions/:id', async (req, res) => {
    try {
        const id = 9;

        const query = `
      SELECT 
        o.*,
        p.street_address,
        p.property_type,
        p.bedrooms,
        p.bathrooms,
        p.square_feet,
        p.year_built,
        b.first_name as buyer_name,
        b.email as buyer_email,
        b.phone as buyer_phone,
        s.first_name as seller_name,
        s.email as seller_email,
        s.phone as seller_phone
      FROM offers o
      LEFT JOIN properties p ON o.property_id = p.id
      LEFT JOIN users b ON o.buyer_id = b.id
      LEFT JOIN users s ON p.seller_id = b.id
      WHERE o.id = $1 
    `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transaction',
            error: error.message
        });
    }
});

// POST /api/transactions - Create new transaction
router.post('/', async (req, res) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const {
            property_id,
            buyer_id,
            seller_id,
            agent_id,
            price,
            status = 'pending',
            phase = 'Pre-Contract',
            closing_date,
            commission_rate = 2.5
        } = req.body;

        // Generate transaction ID
        const transactionId = `TXN-${Date.now().toString().slice(-6)}`;
        const commission = price * (commission_rate / 100);

        // Insert transaction
        const insertQuery = `
      INSERT INTO transactions (
        transaction_id,
        property_id,
        buyer_id,
        seller_id,
        agent_id,
        price,
        status,
        phase,
        progress,
        closing_date,
        commission,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;

        const values = [
            transactionId,
            property_id,
            buyer_id,
            seller_id,
            agent_id,
            price,
            status,
            phase,
            0, // initial progress
            closing_date,
            commission
        ];

        const result = await client.query(insertQuery, values);

        // Update property status
        await client.query(
            'UPDATE properties SET status = $1 WHERE id = $2',
            ['in-transaction', property_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating transaction',
            error: error.message
        });
    } finally {
        client.release();
    }
});

// PUT /api/transactions/:id - Update transaction
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Build dynamic UPDATE query
        const updateFields = Object.keys(updates)
            .filter(key => key !== 'id' && key !== 'transaction_id')
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const updateQuery = `
      UPDATE transactions 
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1 OR transaction_id = $1
      RETURNING *
    `;

        const values = [id, ...Object.values(updates).filter((_, index) => {
            const key = Object.keys(updates)[index];
            return key !== 'id' && key !== 'transaction_id';
        })];

        const result = await db.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            message: 'Transaction updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating transaction',
            error: error.message
        });
    }
});

// PATCH /api/transactions/:id/status - Update transaction status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, phase, progress } = req.body;

        const updateQuery = `
      UPDATE transactions 
      SET status = COALESCE($2, status),
          phase = COALESCE($3, phase),
          progress = COALESCE($4, progress),
          updated_at = NOW()
      WHERE id = $1 OR transaction_id = $1
      RETURNING *
    `;

        const result = await db.query(updateQuery, [id, status, phase, progress]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            message: 'Transaction status updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating transaction status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating transaction status',
            error: error.message
        });
    }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Get transaction details first
        const getQuery = 'SELECT property_id FROM transactions WHERE id = $1 OR transaction_id = $1';
        const transaction = await client.query(getQuery, [id]);

        if (transaction.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Delete transaction
        const deleteQuery = 'DELETE FROM transactions WHERE id = $1 OR transaction_id = $1 RETURNING *';
        const result = await client.query(deleteQuery, [id]);

        // Update property status back to available
        if (transaction.rows[0].property_id) {
            await client.query(
                'UPDATE properties SET status = $1 WHERE id = $2',
                ['available', transaction.rows[0].property_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Transaction deleted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting transaction',
            error: error.message
        });
    } finally {
        client.release();
    }
});

// GET /api/transactions/export - Export transactions to CSV
router.get('/export/csv', async (req, res) => {
    try {
        const query = `
      SELECT 
        t.transaction_id,
        p.address as property,
        p.property_type,
        b.name as buyer,
        s.name as seller,
        t.price,
        t.status,
        t.phase,
        t.progress,
        a.name as agent,
        t.closing_date,
        t.commission,
        t.created_at
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN clients b ON t.buyer_id = b.id
      LEFT JOIN clients s ON t.seller_id = s.id
      LEFT JOIN agents a ON t.agent_id = a.id
      ORDER BY t.created_at DESC
    `;

        const result = await db.query(query);

        // Convert to CSV format
        const csv = convertToCSV(result.rows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
        res.send(csv);

    } catch (error) {
        console.error('Error exporting transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting transactions',
            error: error.message
        });
    }
});

// Helper function to convert to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            return value !== null && value !== undefined ? `"${value}"` : '""';
        }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
}

module.exports = router;