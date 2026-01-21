const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/authMiddleware');

// /api/my-orders needs Auth
router.get('/my-orders', authenticateToken, orderController.getMyOrders);

// /get-snap-token needs Auth (mapped from app.post("/get-snap-token"))
// In server.js it was: app.post("/get-snap-token", authenticateToken, ...)
// Here I probably want to mount this router at /api/orders ?
// But existing frontend expects /get-snap-token
// I will keep it in server.js mapping or rename route?
// Better to standardise to /api/orders/snap-token
// BUT that breaks frontend. 
// I will define it here, and in server.js I will use app.use('/', orderRoutes) or similar to map it to root if I want to preserve paths exactly.
// OR I map it to /api and frontend needs update?
// User said: "Asalkan tidak error" -> Don't break frontend.
// So I must preserve /get-snap-token.
// I will export specific routes or I will mount this router at root '/' in server.js.

router.post('/get-snap-token', authenticateToken, orderController.getSnapToken);
router.post('/update-order-status', orderController.updateOrderStatus);
router.get('/api/midtrans-client-key', orderController.getMidtransClientKey);

module.exports = router;
