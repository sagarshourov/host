const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

const LenderService = require('../services/lenderService');
const PDFService = require('../services/pdfService');

const { authenticateToken } = require('../middleware/auth');
const { 
  PreApproval, 
  PreApprovalDocument, 
  PreApprovalUsage, 
  User,
  sequelize 
} = require('../models');

const lenderService = new LenderService();
const pdfService = new PDFService();

// Get user's current pre-approval status
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const approval = await PreApproval.findOne({
      where: {
        userId: req.params.userId,
        status: 'approved',
        expiresAt: { [Op.gt]: new Date() }
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: PreApprovalDocument,
          as: 'documents'
        }
      ]
    });
    
    if (!approval) {
      return res.json({ approval: null });
    }
    
    // Check if expired and update status
    if (new Date() > approval.expiresAt) {
      await approval.update({ status: 'expired' });
      return res.json({ approval: null });
    }
    
    res.json({ 
      approval: {
        _id: approval.id,
        maxLoanAmount: approval.maxLoanAmount,
        buyerRating: approval.buyerRating,
        expiresAt: approval.expiresAt,
        lenderName: approval.lenderName,
        referenceNumber: approval.referenceNumber,
        downPayment: approval.downPayment,
        expired: false
      }
    });
  } catch (error) {
    console.error('Error fetching approval status:', error);
    res.status(500).json({ error: 'Failed to fetch approval status' });
  }
});

// Check available lenders
router.post('/check-lenders', [
  authenticateToken,
  body('annualIncome').isNumeric().withMessage('Annual income must be a number'),
  body('monthlyDebts').isNumeric().withMessage('Monthly debts must be a number'),
  body('creditScore').isNumeric().withMessage('Credit score must be a number'),
  body('downPayment').isNumeric().withMessage('Down payment must be a number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const lenders = await lenderService.checkAvailableLenders(req.body);
    lenders.sort((a, b) => b.maxLoan - a.maxLoan);
    res.json({ lenders });
  } catch (error) {
    console.error('Error checking lenders:', error);
    res.status(500).json({ error: 'Failed to check lenders' });
  }
});

// Submit pre-approval application
router.post('/submit', [
  authenticateToken,
  body('annualIncome').isNumeric(),
  body('monthlyDebts').isNumeric(),
  body('creditScore').isNumeric(),
  body('downPayment').isNumeric(),
  body('lenderId').notEmpty(),
  body('userId').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const transaction = await sequelize.transaction();
  
  try {
    // Check for existing active approval
    const existingApproval = await PreApproval.findOne({
      where: {
        userId: req.body.userId,
        status: 'approved',
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    
    if (existingApproval) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'You already have an active pre-approval' 
      });
    }
    
    // Perform soft credit check
    const creditCheck = await lenderService.performSoftCreditCheck();
    
    // Submit to lender
    const lenderResponse = await lenderService.submitApplication(
      req.body.lenderId,
      req.body
    );
    
    if (!lenderResponse.approved) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Pre-approval was not approved. Please check your information.' 
      });
    }
    
    // Calculate buyer rating
    const dti = (req.body.monthlyDebts * 12) / req.body.annualIncome;
    const buyerRating = calculateBuyerRating(
      req.body.creditScore,
      req.body.annualIncome,
      dti
    );
    
    // Create approval record
    const approval = await PreApproval.create({
      userId: req.body.userId,
      annualIncome: req.body.annualIncome,
      monthlyDebts: req.body.monthlyDebts,
      creditScore: req.body.creditScore,
      downPayment: req.body.downPayment,
      employmentType: req.body.employmentType,
      employerName: req.body.employerName,
      yearsEmployed: req.body.yearsEmployed,
      propertyType: req.body.propertyType,
      occupancyType: req.body.occupancyType,
      maxLoanAmount: lenderResponse.maxLoanAmount,
      interestRate: lenderResponse.interestRate,
      monthlyPayment: lenderResponse.monthlyPayment,
      lenderId: req.body.lenderId,
      lenderName: lenderResponse.lenderName,
      buyerRating,
      status: 'approved',
      referenceNumber: generateReferenceNumber(),
      expiresAt: lenderResponse.expirationDate,
      softPullDate: creditCheck.date,
      softPullScore: creditCheck.score,
      creditReportId: creditCheck.reportId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      source: 'web'
    }, { transaction });
    
    // Generate pre-approval letter
    const user = await User.findByPk(req.body.userId);
    const letterPath = await pdfService.generatePreApprovalLetter(approval, user);
    
    // Store document reference
    await PreApprovalDocument.create({
      preApprovalId: approval.id,
      documentType: 'pre-approval-letter',
      url: letterPath,
      fileName: `pre-approval-${approval.referenceNumber}.pdf`,
      fileSize: fs.statSync(letterPath).size
    }, { transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      approval: {
        _id: approval.id,
        maxLoanAmount: approval.maxLoanAmount,
        buyerRating: approval.buyerRating,
        expiresAt: approval.expiresAt,
        lenderName: approval.lenderName,
        referenceNumber: approval.referenceNumber
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting pre-approval:', error);
    res.status(500).json({ error: 'Failed to process pre-approval' });
  }
});

// Download pre-approval letter
router.get('/download-letter/:approvalId', authenticateToken, async (req, res) => {
  try {
    const approval = await PreApproval.findByPk(req.params.approvalId, {
      include: [
        {
          model: PreApprovalDocument,
          as: 'documents',
          where: { documentType: 'pre-approval-letter' },
          required: false
        }
      ]
    });
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    // Verify user owns this approval
    if (approval.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let letterPath;
    
    if (approval.documents && approval.documents.length > 0) {
      letterPath = approval.documents[0].url;
    } else {
      // Generate new letter if not found
      const user = await User.findByPk(approval.userId);
      letterPath = await pdfService.generatePreApprovalLetter(approval, user);
      
      // Save document reference
      await PreApprovalDocument.create({
        preApprovalId: approval.id,
        documentType: 'pre-approval-letter',
        url: letterPath,
        fileName: `pre-approval-${approval.referenceNumber}.pdf`
      });
    }
    
    res.download(letterPath, `pre-approval-${approval.referenceNumber}.pdf`);
  } catch (error) {
    console.error('Error downloading letter:', error);
    res.status(500).json({ error: 'Failed to download letter' });
  }
});

// Validate offer amount against pre-approval
router.post('/validate-offer', authenticateToken, async (req, res) => {
  try {
    const { userId, offerAmount, propertyId } = req.body;
    
    const approval = await PreApproval.findOne({
      where: {
        userId,
        status: 'approved',
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    
    if (!approval) {
      return res.json({ 
        valid: false, 
        reason: 'No active pre-approval found' 
      });
    }
    
    const maxPurchasePrice = parseFloat(approval.maxLoanAmount) + 
                            parseFloat(approval.downPayment);
    
    if (offerAmount > maxPurchasePrice) {
      return res.json({
        valid: false,
        reason: `Offer exceeds maximum approved amount of $${maxPurchasePrice.toLocaleString()}`,
        maxAllowed: maxPurchasePrice
      });
    }
    
    // Track usage
    await PreApprovalUsage.create({
      preApprovalId: approval.id,
      propertyId,
      offerAmount,
      offerDate: new Date(),
      status: 'submitted'
    });
    
    res.json({
      valid: true,
      buyerRating: approval.buyerRating,
      preApprovalId: approval.id
    });
  } catch (error) {
    console.error('Error validating offer:', error);
    res.status(500).json({ error: 'Failed to validate offer' });
  }
});

// Get pre-approval analytics
router.get('/analytics/:userId', authenticateToken, async (req, res) => {
  try {
    const approvals = await PreApproval.findAll({
      where: { userId: req.params.userId },
      include: [
        {
          model: PreApprovalUsage,
          as: 'usageHistory'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    const analytics = {
      totalApprovals: approvals.length,
      activeApproval: approvals.find(a => a.status === 'approved' && new Date() < a.expiresAt),
      totalOffersSubmitted: approvals.reduce((sum, a) => sum + (a.usageHistory?.length || 0), 0),
      averageLoanAmount: approvals.reduce((sum, a) => sum + parseFloat(a.maxLoanAmount), 0) / approvals.length || 0
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper Functions
function calculateBuyerRating(creditScore, income, dti) {
  if (creditScore >= 740 && dti < 0.36 && income > 100000) return 'A+';
  if (creditScore >= 700 && dti < 0.43 && income > 75000) return 'A';
  if (creditScore >= 660 && dti < 0.45 && income > 50000) return 'B+';
  if (creditScore >= 620 && dti < 0.50) return 'B';
  return 'C';
}

function generateReferenceNumber() {
  const prefix = 'PA';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

module.exports = router;