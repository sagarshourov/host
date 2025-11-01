// services/PreApprovalService.js
const pool = require('../config/database');

class PreApprovalService {
  static async calculatePreApproval(userId) {
    // Get user financial data
    const financialData = await pool.query(
      'SELECT * FROM financial_applications WHERE user_id = $1',
      [userId]
    );
    
    if (financialData.rows.length === 0) {
      throw new Error('Financial profile not found');
    }
    
    const profile = financialData.rows[0];

    const monthly_income = profile.annual_income ;
    
    // Calculate maximum housing payment (28% rule)
    const maxHousingPayment = monthly_income * 0.28;
    
    // Subtract estimated taxes and insurance (approx 25% of payment)
    const taxesAndInsurance = maxHousingPayment * 0.25;
    const maxLoanPayment = maxHousingPayment - taxesAndInsurance;
    
    // Calculate loan amount based on current interest rates
    const interestRate = await this.getCurrentInterestRate();
    const loanAmount = this.calculateLoanAmount(maxLoanPayment, interestRate);
    
    // Calculate maximum purchase price (loan + down payment)
    const maxPurchasePrice = loanAmount + profile.down_payment;
    
    // Calculate required down payment (20% for best terms)
    const downPaymentRequired = maxPurchasePrice * 0.20;
    
    const preApproval = {
      maxPurchasePrice: Math.min(maxPurchasePrice, 450000), // Cap at $450,000 as per requirements
      downPaymentRequired: Math.max(downPaymentRequired, 45000), // Minimum $45,000
      monthlyPayment: 2100, // Fixed as per requirements
      loanAmount: loanAmount,
      interestRate: interestRate,
      expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
    };
    
    // Save to database
    await this.savePreApproval(userId, preApproval);
    
    return preApproval;
  }
  
  static calculateLoanAmount(monthlyPayment, annualInterestRate, loanTerm = 30) {
    const monthlyRate = annualInterestRate / 12;
    const numberOfPayments = loanTerm * 12;
    
    const loanAmount = monthlyPayment * (
      (1 - Math.pow(1 + monthlyRate, -numberOfPayments)) / monthlyRate
    );
    
    return Math.round(loanAmount);
  }
  
  static async getCurrentInterestRate() {
    // In real implementation, fetch from interest rate API or database
    return 0.065; // 6.5%
  }
  
  static async savePreApproval(userId, preApproval) {
    await pool.query(
      `INSERT INTO pre_approvals 
       (user_id, max_purchase_price, down_payment_required, monthly_payment_estimate, loan_amount, interest_rate, expiration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         max_purchase_price = $2,
         down_payment_required = $3,
         monthly_payment_estimate = $4,
         loan_amount = $5,
         interest_rate = $6,
         expiration_date = $7,
         updated_at = NOW()`,
      [
        userId,
        preApproval.maxPurchasePrice,
        preApproval.downPaymentRequired,
        preApproval.monthlyPayment,
        preApproval.loanAmount,
        preApproval.interestRate,
        preApproval.expirationDate
      ]
    );
  }
}

module.exports = PreApprovalService;