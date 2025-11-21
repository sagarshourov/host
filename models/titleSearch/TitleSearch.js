// models/titleSearch/TitleSearch.js
const db = require('../../config/database');

class TitleSearch {
  // Create new title search
  static async create(titleSearchData) {
    const {
      transaction_id,
      title_company_id,
      status = 'ordered',
      search_report = null
    } = titleSearchData;

    const query = `
      INSERT INTO title_searches (transaction_id, title_company_id, status, search_report)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [transaction_id, title_company_id, status, search_report];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Find by ID
  static async findById(id) {
    const query = `
      SELECT ts.*, tc.name as title_company_name, tc.email as title_company_email
      FROM title_searches ts
      LEFT JOIN title_companies tc ON ts.title_company_id = tc.id
      WHERE ts.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find by transaction ID
  static async findByTransactionId(transactionId) {
    const query = `
      SELECT ts.*, tc.name as title_company_name, tc.email as title_company_email
      FROM title_searches ts
      LEFT JOIN title_companies tc ON ts.title_company_id = tc.id
      WHERE ts.transaction_id = $1
      ORDER BY ts.created_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [transactionId]);
    return result.rows[0];
  }

  // Update status
  static async updateStatus(id, status) {
    const query = `
      UPDATE title_searches 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  // Mark as completed
  static async markCompleted(id) {
    const query = `
      UPDATE title_searches 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Update search report
  static async updateSearchReport(id, searchReport) {
    const query = `
      UPDATE title_searches 
      SET search_report = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [searchReport, id]);
    return result.rows[0];
  }

  // Get all title searches for a transaction
  static async findByTransaction(transactionId) {
    const query = `
      SELECT ts.*, tc.name as title_company_name
      FROM title_searches ts
      LEFT JOIN title_companies tc ON ts.title_company_id = tc.id
      WHERE ts.transaction_id = $1
      ORDER BY ts.created_at DESC
    `;
    const result = await db.query(query, [transactionId]);
    return result.rows;
  }

  // Delete title search (admin only)
  static async delete(id) {
    const query = 'DELETE FROM title_searches WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = TitleSearch;