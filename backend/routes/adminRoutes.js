const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

// Middleware for all admin routes?
// server.js put authenticateToken, authorizeAdmin on each.
// I can use router.use(authenticateToken, authorizeAdmin) to apply to all in this file if I am sure.
// Yes, all endpoints extracted to adminController were protected.

router.use(authenticateToken, authorizeAdmin);

router.get('/stats', adminController.getAdminStats);
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/all-users', adminController.getAllUsers);

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSetting);
router.put('/settings/bulk', adminController.bulkUpdateSettings);

router.post('/set-cheki-stock', adminController.setChekiStock);
router.post('/update-cheki-stock', adminController.updateChekiStock);

router.post('/undo-ticket-status', adminController.undoTicketStatus);
router.delete('/orders/:id', adminController.deleteOrder);

module.exports = router;
