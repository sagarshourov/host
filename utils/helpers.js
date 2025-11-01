const crypto = require('crypto');

const generateConfirmationCode = () => {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

module.exports = { generateConfirmationCode };