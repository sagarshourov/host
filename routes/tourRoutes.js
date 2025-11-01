
const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const { authenticateToken } = require('../middleware/auth');
const { validateTour } = require('../middleware/validation');

// Public routes
router.post('/', validateTour, tourController.scheduleTour);
router.get('/available-slots/:propertyId', tourController.getAvailableSlots);
router.get('/confirm/:confirmationCode', tourController.confirmTour);

// Protected routes (requires authentication)
router.use(authenticateToken);
router.get('/upcoming', tourController.getUpcomingTours);
router.get('/history', tourController.getTourHistory);
router.patch('/:id/cancel', tourController.cancelTour);
router.patch('/:id/reschedule', tourController.rescheduleTour);
router.post('/:id/feedback', tourController.submitFeedback);
router.get('/:id', tourController.getTourDetails);

// Seller routes
router.post('/availability', tourController.setAvailability);
router.get('/property/:propertyId', tourController.getPropertyTours);

module.exports = router;

