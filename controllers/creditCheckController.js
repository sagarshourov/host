// controllers/creditCheckController.js
const { runSoftCreditCheck, getCreditRatingBand } = require('../services/creditBureauService');
const { storeCreditCheck, updateTask } = require('../models/creditCheckModel');
const crypto = require('crypto');

const runCreditCheck = async (req, res) => {
  try {
    const { ssn, offerId, verificationAnswers } = req.body;
    const userId = req.user.userId; // Assuming you have authentication middleware

    // Hash SSN for secure storage
    const ssnHash = crypto.createHash('sha256').update(ssn).digest('hex');

    // Verify identity questions (simplified - in real app, use proper verification service)
    const identityVerified = verifyIdentityQuestions(verificationAnswers);
    if (!identityVerified) {
      return res.status(400).json({
        error: 'Identity verification failed'
      });
    }

    // Simulate credit bureau API call
    const creditScore = await runSoftCreditCheck(ssn);

    // Convert to rating band
    const creditRating = getCreditRatingBand(creditScore);

    // Calculate preliminary approval
    const preliminaryApproval = calculatePreliminaryApproval(creditRating);

    // Store only the rating band, not the actual score
    await storeCreditCheck({
      userId,
      ssnHash,
      creditRating,
      preliminaryApproval
    });



    await updateTask(2, offerId);



    res.json({
      creditRating,
      preliminaryApproval,
      message: 'Credit check completed successfully'
    });

  } catch (error) {
    console.error('Credit check error:', error);
    res.status(500).json({
      error: 'Failed to complete credit check'
    });
  }
};


const updateTasks = async (taskId, offerId) => {
  await updateTask(taskId, offerId);
}

const verifyIdentityQuestions = (answers) => {
  // In a real application, this would integrate with a proper identity verification service
  // For demo purposes, we'll assume all answers are correct
  return Object.keys(answers).length > 0;
};

const calculatePreliminaryApproval = (creditRating) => {
  const approvalAmounts = {
    'Excellent': 50000,
    'Good': 35000,
    'Fair': 20000,
    'Needs improvement': 5000
  };
  return approvalAmounts[creditRating] || 0;
};

module.exports = {
  runCreditCheck,
  updateTasks
};