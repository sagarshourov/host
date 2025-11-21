// routes/inspections.js
const express = require('express');
const router = express.Router();
const { 
  getInspectors, 
  scheduleInspection, 
  getInspection, 
  uploadReport, 
  createRepairRequest,
  updateRepairRequest,
  getTransactionInspections 
} = require('../controllers/inspectionController');


const { authenticateToken } = require('../middleware/auth');

// CORRECT WAY: Import the specific upload function you need
const { uploadReport: uploadReportMiddleware } = require('../middleware/uploadMiddleware');

router.get('/inspectors', getInspectors);
router.get('/transaction/:transactionId', authenticateToken, getTransactionInspections);
router.post('/schedule', authenticateToken, scheduleInspection);
router.get('/:id', authenticateToken, getInspection);

// FIXED: Use the specific upload middleware correctly
router.put('/:id/report', authenticateToken, uploadReportMiddleware.single('report'), uploadReport);

router.post('/:id/repair-request', authenticateToken, createRepairRequest);
router.put('/repair-request/:id', authenticateToken, updateRepairRequest);

module.exports = router;