// services/creditBureauService.js
// Mock service - replace with actual credit bureau integration

const runSoftCreditCheck = async (ssn) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Mock credit score generation based on SSN (in real app, use actual credit bureau API)
  // This is a simplified mock - real implementation would use Experian/Equifax/TransUnion APIs
  const randomScore = Math.floor(Math.random() * 350) + 300; // 300-650 range
  
  return randomScore;
};

const getCreditRatingBand = (score) => {
  if (score >= 750) return 'Excellent';
  if (score >= 700) return 'Good';
  if (score >= 650) return 'Fair';
  return 'Needs improvement';
};

module.exports = {
  runSoftCreditCheck,
  getCreditRatingBand
};