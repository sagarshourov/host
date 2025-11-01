
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'real_estate_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    // Multiple queries for different stats
    const queries = {
      // Total transactions and volume
      totals: `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(price) as total_volume,
          SUM(commission) as total_commission,
          AVG(price) as avg_price
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '${period} days'
      `,
      
      // Status breakdown
      statusBreakdown: `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(price) as volume
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY status
      `,
      
      // Monthly trend
      monthlyTrend: `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as transactions,
          SUM(price) as volume,
          SUM(commission) as commission
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `,
      
      // Top agents
      topAgents: `
        SELECT 
          a.name as agent_name,
          COUNT(t.id) as deals,
          SUM(t.price) as volume,
          SUM(t.commission) as commission
        FROM transactions t
        JOIN agents a ON t.agent_id = a.id
        WHERE t.created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY a.id, a.name
        ORDER BY commission DESC
        LIMIT 5
      `,
      
      // Property type distribution
      propertyTypes: `
        SELECT 
          p.property_type,
          COUNT(t.id) as count,
          AVG(t.price) as avg_price
        FROM transactions t
        JOIN properties p ON t.property_id = p.id
        WHERE t.created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY p.property_type
      `,
      
      // Recent transactions
      recentTransactions: `
        SELECT 
          t.transaction_id,
          p.address as property,
          t.price,
          t.status,
          t.created_at
        FROM transactions t
        LEFT JOIN properties p ON t.property_id = p.id
        ORDER BY t.created_at DESC
        LIMIT 5
      `
    };

    // Execute all queries in parallel
    const results = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const result = await db.query(query);
        return { [key]: result.rows };
      })
    );

    // Combine results
    const stats = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});

    res.json({
      success: true,
      data: stats,
      period: parseInt(period)
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

// GET /api/dashboard/metrics - Get key performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const metricsQuery = `
      WITH current_month AS (
        SELECT 
          COUNT(*) as transactions,
          SUM(price) as volume,
          SUM(commission) as commission
        FROM transactions
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      ),
      previous_month AS (
        SELECT 
          COUNT(*) as transactions,
          SUM(price) as volume,
          SUM(commission) as commission
        FROM transactions
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      ),
      active_deals AS (
        SELECT COUNT(*) as count
        FROM transactions
        WHERE status = 'in-progress'
      ),
      closing_soon AS (
        SELECT COUNT(*) as count
        FROM transactions
        WHERE closing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND status != 'completed' AND status != 'cancelled'
      )
      SELECT 
        cm.transactions as current_transactions,
        cm.volume as current_volume,
        cm.commission as current_commission,
        pm.transactions as previous_transactions,
        pm.volume as previous_volume,
        pm.commission as previous_commission,
        ad.count as active_deals,
        cs.count as closing_soon,
        CASE 
          WHEN pm.transactions > 0 
          THEN ROUND(((cm.transactions - pm.transactions)::numeric / pm.transactions) * 100, 2)
          ELSE 0
        END as transaction_change,
        CASE 
          WHEN pm.volume > 0 
          THEN ROUND(((cm.volume - pm.volume)::numeric / pm.volume) * 100, 2)
          ELSE 0
        END as volume_change,
        CASE 
          WHEN pm.commission > 0 
          THEN ROUND(((cm.commission - pm.commission)::numeric / pm.commission) * 100, 2)
          ELSE 0
        END as commission_change
      FROM current_month cm, previous_month pm, active_deals ad, closing_soon cs
    `;

    const result = await db.query(metricsQuery);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching metrics',
      error: error.message
    });
  }
});

module.exports = router;