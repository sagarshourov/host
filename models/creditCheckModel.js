// models/creditCheckModel.js
const pool = require('../config/database');

const storeCreditCheck = async (creditData) => {
  const { userId, ssnHash, creditRating, preliminaryApproval } = creditData;

  const query = `
    INSERT INTO credit_checks (user_id, ssn_hash, credit_rating, preliminary_approval)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const values = [userId, ssnHash, creditRating, preliminaryApproval];

  const result = await pool.query(query, values);






  return result.rows[0];
};

const updateTask = async (task_id , offerId) => {

  await pool.query(
    `UPDATE task_value  SET status = 'completed' WHERE task_id = $1 AND offer_id = $2`,
    [task_id, offerId]
  ); // done esign
};


const getCreditHistory = async (userId) => {
  const query = `
    SELECT credit_rating, preliminary_approval, created_at
    FROM credit_checks
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};

module.exports = {
  storeCreditCheck,
  getCreditHistory,
  updateTask
};