// models/titleSearch/TitleInsurance.js
const db = require('../../config/database');

class TitleInsurance {
  // Create new title insurance policy
  static async create(insuranceData) {
    const {
      transaction_id,
      policy_number,
      policy_type = "owner's",
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      coverage_details = {},
      status = 'pending',
      policy_document_url = null
    } = insuranceData;

    const query = `
      INSERT INTO title_insurance_policies (
        transaction_id, policy_number, policy_type, issue_date, effective_date,
        policy_amount, premium_amount, coverage_details, status, policy_document_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      transaction_id,
      policy_number,
      policy_type,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      JSON.stringify(coverage_details),
      status,
      policy_document_url
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Find by ID
  static async findById(id) {
    const query = 'SELECT * FROM title_insurance_policies WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find by transaction ID
  static async findByTransactionId(transactionId) {
    const query = `
      SELECT * FROM title_insurance_policies 
      WHERE transaction_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [transactionId]);
    return result.rows[0];
  }

  // Find all policies for a transaction
  static async findAllByTransactionId(transactionId) {
    const query = `
      SELECT * FROM title_insurance_policies 
      WHERE transaction_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [transactionId]);
    return result.rows;
  }

  // Update policy status
  static async updateStatus(id, status) {
    const query = `
      UPDATE title_insurance_policies 
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  // Issue policy
  static async issuePolicy(id, policyDocumentUrl = null) {
    const query = `
      UPDATE title_insurance_policies 
      SET status = 'issued', 
          policy_document_url = COALESCE($1, policy_document_url),
          issue_date = CURRENT_DATE
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [policyDocumentUrl, id]);
    return result.rows[0];
  }

  // Update policy document
  static async updateDocument(id, documentUrl) {
    const query = `
      UPDATE title_insurance_policies 
      SET policy_document_url = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [documentUrl, id]);
    return result.rows[0];
  }

  // Update coverage details
  static async updateCoverage(id, coverageDetails) {
    const query = `
      UPDATE title_insurance_policies 
      SET coverage_details = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [JSON.stringify(coverageDetails), id]);
    return result.rows[0];
  }

  // Get policies by type
  static async findByType(transactionId, policyType) {
    const query = `
      SELECT * FROM title_insurance_policies 
      WHERE transaction_id = $1 AND policy_type = $2
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [transactionId, policyType]);
    return result.rows;
  }

  // Delete policy (admin only)
  static async delete(id) {
    const query = 'DELETE FROM title_insurance_policies WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = TitleInsurance;