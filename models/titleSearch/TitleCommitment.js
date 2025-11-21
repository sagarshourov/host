// models/titleSearch/TitleCommitment.js
const db = require('../../config/database');

class TitleCommitment {
  // Create new title commitment
  static async create(commitmentData) {
    const {
      title_search_id,
      commitment_number,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      commitment_document_url = null,
      status = 'pending_review'
    } = commitmentData;

    const query = `
      INSERT INTO title_commitments (
        title_search_id, commitment_number, issue_date, effective_date,
        policy_amount, premium_amount, commitment_document_url, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      title_search_id,
      commitment_number,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      commitment_document_url,
      status
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Find by ID
  static async findById(id) {
    const query = `
      SELECT tc.*, ts.transaction_id
      FROM title_commitments tc
      JOIN title_searches ts ON tc.title_search_id = ts.id
      WHERE tc.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find by title search ID
  static async findByTitleSearchId(titleSearchId) {
    const query = `
      SELECT * FROM title_commitments 
      WHERE title_search_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [titleSearchId]);
    return result.rows[0];
  }

  // Approve commitment
  static async approve(id) {
    const query = `
      UPDATE title_commitments 
      SET status = 'approved'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Reject commitment
  static async reject(id, rejectionReason) {
    const query = `
      UPDATE title_commitments 
      SET status = 'rejected', rejection_reason = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [rejectionReason, id]);
    return result.rows[0];
  }

  // Update commitment document
  static async updateDocument(id, documentUrl) {
    const query = `
      UPDATE title_commitments 
      SET commitment_document_url = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [documentUrl, id]);
    return result.rows[0];
  }

  // Get all commitments for a transaction
  static async findByTransactionId(transactionId) {
    const query = `
      SELECT tc.*
      FROM title_commitments tc
      JOIN title_searches ts ON tc.title_search_id = ts.id
      WHERE ts.transaction_id = $1
      ORDER BY tc.created_at DESC
    `;
    const result = await db.query(query, [transactionId]);
    return result.rows;
  }

  // Update commitment
  static async update(id, updateData) {
    const {
      commitment_number,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      commitment_document_url,
      status
    } = updateData;

    const query = `
      UPDATE title_commitments 
      SET commitment_number = $1,
          issue_date = $2,
          effective_date = $3,
          policy_amount = $4,
          premium_amount = $5,
          commitment_document_url = $6,
          status = $7
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      commitment_number,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      commitment_document_url,
      status,
      id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = TitleCommitment;