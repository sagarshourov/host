// services/BuyerRatingService.js
const pool = require('../config/database');

class BuyerRatingService {
  static async calculateBuyerRating(userId) {
    // Get user financial data
    const financialData = await pool.query(
      `SELECT * FROM financial_applications WHERE user_id = $1`,
      [userId]
    );

    if (financialData.rows.length === 0) {
      throw new Error('Financial profile not found');
    }

    const profile = financialData.rows[0];

    // Calculate component scores
    const creditScore = this.calculateCreditScore(profile.credit_score);
    const downPaymentScore = this.calculateDownPaymentScore(profile.down_payment_percentage);
    const incomeStabilityScore = this.calculateIncomeStabilityScore(profile.employment_duration_months);
    const debtToIncomeScore = this.calculateDebtToIncomeScore(profile.debt_to_income_ratio);

    // Calculate weighted overall score
    const overallScore = 
      (creditScore * 0.40) +
      (downPaymentScore * 0.30) +
      (incomeStabilityScore * 0.20) +
      (debtToIncomeScore * 0.10);

    // Determine rating grade
    const grade = this.determineRatingGrade(overallScore, profile.down_payment_percentage, profile.credit_score);

    // Generate improvement tips
    const improvementTips = this.generateImprovementTips(
      creditScore, 
      downPaymentScore, 
      incomeStabilityScore, 
      debtToIncomeScore,
      profile
    );

    const breakdown = [
      { category: 'Credit Rating', score: creditScore, weight: 40 },
      { category: 'Down Payment', score: downPaymentScore, weight: 30 },
      { category: 'Income Stability', score: incomeStabilityScore, weight: 20 },
      { category: 'Debt-to-Income', score: debtToIncomeScore, weight: 10 }
    ];

    const rating = {
      overallScore: Math.round(overallScore),
      grade,
      breakdown,
      improvementTips
    };

    // Save to database
    await this.saveBuyerRating(userId, rating, profile);

    return rating;
  }

  static calculateCreditScore(creditScore) {
    if (creditScore >= 780) return 100;
    if (creditScore >= 720) return 90;
    if (creditScore >= 680) return 80;
    if (creditScore >= 640) return 70;
    if (creditScore >= 600) return 60;
    return 50;
  }

  static calculateDownPaymentScore(downPaymentPercent) {
    if (downPaymentPercent >= 20) return 100;
    if (downPaymentPercent >= 15) return 90;
    if (downPaymentPercent >= 10) return 80;
    if (downPaymentPercent >= 5) return 70;
    return 50;
  }

  static calculateIncomeStabilityScore(employmentMonths) {
    if (employmentMonths >= 60) return 100; // 5+ years
    if (employmentMonths >= 36) return 90;  // 3-5 years
    if (employmentMonths >= 24) return 80;  // 2-3 years
    if (employmentMonths >= 12) return 70;  // 1-2 years
    return 60; // Less than 1 year
  }

  static calculateDebtToIncomeScore(dtiRatio) {
    if (dtiRatio <= 0.28) return 100;  // Excellent
    if (dtiRatio <= 0.36) return 90;   // Good
    if (dtiRatio <= 0.43) return 80;   // Acceptable
    if (dtiRatio <= 0.50) return 70;   // High
    return 50; // Very high
  }

  static determineRatingGrade(overallScore, downPaymentPercent, creditScore) {
    // A+ = Cash buyers or 20%+ down with excellent credit
    if (downPaymentPercent >= 20 && creditScore >= 720) return 'A+';
    if (overallScore >= 90) return 'A+';
    
    // B+ = 10-19% down with good credit
    if (downPaymentPercent >= 10 && creditScore >= 680) return 'B+';
    if (overallScore >= 75) return 'B+';
    
    // C = 5-9% down with fair credit
    return 'C';
  }

  static generateImprovementTips(creditScore, downPaymentScore, incomeStabilityScore, debtToIncomeScore, profile) {
    const tips = [];

    if (creditScore < 80) {
      tips.push('Improve your credit score by paying bills on time and reducing credit card balances');
    }

    if (downPaymentScore < 80) {
      tips.push(`Increase your down payment to ${profile.down_payment_percentage < 20 ? '20%' : 'a higher percentage'} for better terms`);
    }

    if (incomeStabilityScore < 80) {
      tips.push('Longer employment history with current employer improves income stability score');
    }

    if (debtToIncomeScore < 80) {
      tips.push('Reduce your debt-to-income ratio by paying down existing debts');
    }

    if (profile.down_payment_percentage < 20) {
      tips.push('A 20% down payment eliminates private mortgage insurance (PMI)');
    }

    return tips;
  }

  static async saveBuyerRating(userId, rating, profile) {
    await pool.query(
      `INSERT INTO buyer_ratings 
       (user_id, overall_score, grade, credit_score, down_payment_percentage, 
        income_stability_score, debt_to_income_ratio, breakdown, improvement_tips)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         overall_score = $2,
         grade = $3,
         credit_score = $4,
         down_payment_percentage = $5,
         income_stability_score = $6,
         debt_to_income_ratio = $7,
         breakdown = $8,
         improvement_tips = $9,
         updated_at = NOW()`,
      [
        userId,
        rating.overallScore,
        rating.grade,
        profile.credit_score,
        profile.down_payment_percentage,
        profile.income_stability_score,
        profile.debt_to_income_ratio,
        JSON.stringify(rating.breakdown),
        rating.improvementTips
      ]
    );
  }

  static async forceRecalculate(userId) {
    // Force recalculation by fetching fresh financial data
    return await this.calculateBuyerRating(userId);
  }
}

module.exports = BuyerRatingService;