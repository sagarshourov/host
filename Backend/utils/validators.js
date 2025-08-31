const { body, validationResult } = require('express-validator');

const validateLOI = [
  body('buyerName').notEmpty().withMessage('Buyer name is required'),
  body('buyerEmail').isEmail().withMessage('Valid buyer email is required'),
  body('sellerName').notEmpty().withMessage('Seller name is required'),
  body('sellerEmail').isEmail().withMessage('Valid seller email is required'),
  body('propertyAddress').notEmpty().withMessage('Property address is required'),
  body('propertyCity').notEmpty().withMessage('Property city is required'),
  body('propertyState').notEmpty().withMessage('Property state is required'),
  body('purchasePrice').isNumeric().withMessage('Purchase price must be a number'),
  body('depositAmount').isNumeric().withMessage('Deposit amount must be a number'),
  body('possessionDate').isISO8601().withMessage('Valid possession date is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateLOI
};