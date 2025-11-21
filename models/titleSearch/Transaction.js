// models/Transaction.js
const db = require('../../config/database');

class Transaction {
  // Find by ID
  static async findById(id) {
    const query = `
      SELECT t.*, 
             p.street_address as property_address,
             p.city as property_city,
             p.state as property_state,
             p.zip_code as property_zip_code,
             buyer.first_name as buyer_first_name,
             buyer.last_name as buyer_last_name,
             seller.first_name as seller_first_name,
             seller.last_name as seller_last_name
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      LEFT JOIN users seller ON t.seller_id = seller.id
      WHERE t.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Update transaction phase
  static async updatePhase(id, phase) {
    const query = `
      UPDATE transactions 
      SET current_phase = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [phase, id]);
    return result.rows[0];
  }

  // Update transaction status
  static async updateStatus(id, status) {
    const query = `
      UPDATE transactions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  // Get transaction with all related data
  static async getFullDetails(id) {
    const query = `
      SELECT 
        t.*,
        p.*,
        buyer.first_name as buyer_first_name,
        buyer.last_name as buyer_last_name,
        buyer.email as buyer_email,
        seller.first_name as seller_first_name,
        seller.last_name as seller_last_name,
        seller.email as seller_email,
        agent.first_name as agent_first_name,
        agent.last_name as agent_last_name
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      LEFT JOIN users seller ON t.seller_id = seller.id
      LEFT JOIN users agent ON t.agent_id = agent.id
      WHERE t.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Check if user has access to transaction
  static async checkUserAccess(transactionId, userId) {
    const query = `
      SELECT * FROM transactions 
      WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR agent_id = $2 OR created_by = $2)
    `;
    const result = await db.query(query, [transactionId, userId]);
    return result.rows.length > 0;
  }

  // Get all transactions for a user
  static async findByUserId(userId) {
    const query = `
      SELECT t.*, p.address, p.city, p.state
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      WHERE t.buyer_id = $1 OR t.seller_id = $1 OR t.agent_id = $1
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

module.exports = Transaction;