const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/authMiddleware');

// PUBLIC endpoint - Midtrans client key (no auth)
router.get('/api/midtrans-client-key', orderController.getMidtransClientKey);

// PROTECTED endpoints - Require authentication
router.get('/api/my-orders', authenticateToken, orderController.getMyOrders);

// Legacy paths preserved for backward compatibility
router.post('/get-snap-token', authenticateToken, orderController.getSnapToken);
router.post('/update-order-status', orderController.updateOrderStatus);

module.exports = router;
