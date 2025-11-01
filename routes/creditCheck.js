// routes/creditCheck.js
const express = require('express');
const router = express.Router();
const creditCheckController = require('../controllers/creditCheckController');
const { validateCreditCheck } = require('../middleware/validation');


const PreApprovalService = require('../services/PreApprovalService');
const PDFService = require('../services/PrePdfService');
//const EmailService = require('../services/EmailService');




const { authenticateToken } = require('../middleware/auth');

router.post('/credit-check', authenticateToken, validateCreditCheck, creditCheckController.runCreditCheck);

router.get('/downpreval/:offerid/:userid', async (req, res) => {
    // res.status(500).json({ message: "sa" });
    try {

        const { offerid, userid } = req.params;

        const preApproval = await PreApprovalService.calculatePreApproval(userid);

        const pdfBuffer = await PDFService.generatePreApprovalLetter(preApproval);


        creditCheckController.updateTasks(3, offerid);


        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=pre-approval-letter.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});







module.exports = router;