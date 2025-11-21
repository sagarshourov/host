// routes/titleSearch.js
const express = require('express');
const router = express.Router();
const {
  orderTitleSearch,
  getTitleSearch,
  updateTitleSearchStatus,
  addTitleIssue,
  resolveTitleIssue,
  createTitleCommitment,
  approveTitleCommitment,
  issueTitleInsurance,
  getTitleInsurancePolicy
} = require('../controllers/titleSearchController');


const { authenticateToken } = require('../middleware/auth');

router.post('/order', authenticateToken, orderTitleSearch);
router.get('/:transactionId', getTitleSearch);
router.put('/:id/status', authenticateToken, updateTitleSearchStatus);
router.post('/:titleSearchId/issues', authenticateToken, addTitleIssue);
router.put('/issues/:issueId/resolve', authenticateToken, resolveTitleIssue);
router.post('/:titleSearchId/commitment', authenticateToken, createTitleCommitment);
router.put('/commitment/:commitmentId/approve', authenticateToken, approveTitleCommitment);
router.post('/:transactionId/insurance', authenticateToken, issueTitleInsurance);
router.get('/insurance/:transactionId', authenticateToken, getTitleInsurancePolicy);

module.exports = router;