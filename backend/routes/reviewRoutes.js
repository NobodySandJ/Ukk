const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public: Get all reviews (for homepage)
router.get('/', reviewController.getAllReviews);

// Authenticated: User review operations
router.get('/my-review', authenticateToken, reviewController.getMyReview);
router.get('/eligibility', authenticateToken, reviewController.checkEligibility);
router.post('/', authenticateToken, reviewController.createReview);
router.put('/', authenticateToken, reviewController.updateReview);

module.exports = router;
