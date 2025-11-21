// models/titleSearch/TitleIssue.js
const db = require('../../config/database');

class TitleIssue {
  // Create new title issue
  static async create(issueData) {
    const {
      title_search_id,
      issue_type,
      description,
      severity = 'medium',
      status = 'open'
    } = issueData;

    const query = `
      INSERT INTO title_issues (title_search_id, issue_type, description, severity, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [title_search_id, issue_type, description, severity, status];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Find by ID
  static async findById(id) {
    const query = 'SELECT * FROM title_issues WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find by title search ID
  static async findByTitleSearchId(titleSearchId) {
    const query = `
      SELECT * FROM title_issues 
      WHERE title_search_id = $1 
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
    `;
    const result = await db.query(query, [titleSearchId]);
    return result.rows;
  }

  // Find unresolved issues by title search ID
  static async findUnresolved(titleSearchId) {
    const query = `
      SELECT * FROM title_issues 
      WHERE title_search_id = $1 AND status = 'open'
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    `;
    const result = await db.query(query, [titleSearchId]);
    return result.rows;
  }

  // Resolve issue
  static async resolve(id, resolutionNotes) {
    const query = `
      UPDATE title_issues 
      SET status = 'resolved', 
          resolution_notes = $1, 
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [resolutionNotes, id]);
    return result.rows[0];
  }

  // Update issue
  static async update(id, updateData) {
    const { issue_type, description, severity, status } = updateData;
    
    const query = `
      UPDATE title_issues 
      SET issue_type = $1, description = $2, severity = $3, status = $4
      WHERE id = $5
      RETURNING *
    `;
    const values = [issue_type, description, severity, status, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Delete issue
  static async delete(id) {
    const query = 'DELETE FROM title_issues WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Get issues by severity
  static async findBySeverity(titleSearchId, severity) {
    const query = `
      SELECT * FROM title_issues 
      WHERE title_search_id = $1 AND severity = $2
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [titleSearchId, severity]);
    return result.rows;
  }

  // Get issue statistics for a title search
  static async getStatistics(titleSearchId) {
    const query = `
      SELECT 
        severity,
        status,
        COUNT(*) as count
      FROM title_issues 
      WHERE title_search_id = $1
      GROUP BY severity, status
      ORDER BY severity, status
    `;
    const result = await db.query(query, [titleSearchId]);
    return result.rows;
  }
}

module.exports = TitleIssue;