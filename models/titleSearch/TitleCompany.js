// models/titleSearch/TitleCompany.js
const db = require('../../config/database');

class TitleCompany {
  // Create new title company
  static async create(companyData) {
    const {
      name,
      address,
      phone,
      email,
      license_number
    } = companyData;

    const query = `
      INSERT INTO title_companies (name, address, phone, email, license_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [name, address, phone, email, license_number];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Find by ID
  static async findById(id) {
    const query = 'SELECT * FROM title_companies WHERE id = $1 AND active = true';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Find all active title companies
  static async findAll() {
    const query = 'SELECT * FROM title_companies WHERE active = true ORDER BY name';
    const result = await db.query(query);
    return result.rows;
  }

  // Find default title company
  static async findDefault() {
    const query = 'SELECT * FROM title_companies WHERE active = true ORDER BY id LIMIT 1';
    const result = await db.query(query);
    return result.rows[0];
  }

  // Update title company
  static async update(id, updateData) {
    const { name, address, phone, email, license_number, active } = updateData;
    
    const query = `
      UPDATE title_companies 
      SET name = $1, address = $2, phone = $3, email = $4, license_number = $5, active = $6
      WHERE id = $7
      RETURNING *
    `;
    const values = [name, address, phone, email, license_number, active, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Soft delete title company
  static async delete(id) {
    const query = `
      UPDATE title_companies 
      SET active = false 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Search title companies
  static async search(searchTerm) {
    const query = `
      SELECT * FROM title_companies 
      WHERE active = true 
        AND (name ILIKE $1 OR address ILIKE $1 OR email ILIKE $1)
      ORDER BY name
    `;
    const result = await db.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }
}

module.exports = TitleCompany;