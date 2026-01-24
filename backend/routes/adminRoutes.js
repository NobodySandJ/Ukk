const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const memberController = require('../controllers/memberController');
const newsController = require('../controllers/newsController');
const galleryController = require('../controllers/galleryController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

// ============================================================
// MIDDLEWARE: Apply authentication to all admin routes
// ============================================================
router.use(authenticateToken, authorizeAdmin);

// ============================================================
// ADMIN STATISTICS & DASHBOARD
// ============================================================
router.get('/stats', adminController.getAdminStats);
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/monthly-stats', adminController.getMonthlyStats);
router.get('/all-orders', adminController.getAllOrders);
router.get('/all-users', adminController.getAllUsers);

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSetting);
router.put('/settings/bulk', adminController.bulkUpdateSettings);

// ============================================================
// STOCK MANAGEMENT
// ============================================================
router.post('/set-cheki-stock', adminController.setChekiStock);
router.post('/update-cheki-stock', adminController.updateChekiStock);

// ============================================================
// ORDER MANAGEMENT
// ============================================================
router.post('/undo-ticket-status', adminController.undoTicketStatus);
router.post('/cleanup-orders', adminController.cleanupOrders);
router.post('/generate-reset-code', adminController.generateResetCode);
router.delete('/orders/:id', adminController.deleteOrder);

// ============================================================
// MEMBERS MANAGEMENT (CRUD)
// ============================================================
router.get('/members', memberController.getAllMembers);
router.get('/members/:id', memberController.getMemberById);
router.post('/members', memberController.createMember);
router.put('/members/:id', memberController.updateMember);
router.delete('/members/:id', memberController.deleteMember);

// ============================================================
// NEWS MANAGEMENT (CRUD)
// ============================================================
router.get('/news', newsController.getAllNews);
router.get('/news/:id', newsController.getNewsById);
router.post('/news', newsController.createNews);
router.put('/news/:id', newsController.updateNews);
router.delete('/news/:id', newsController.deleteNews);

// ============================================================
// GALLERY MANAGEMENT (CRUD)
// ============================================================
router.get('/gallery', galleryController.getAllGallery);
router.get('/gallery/:id', galleryController.getGalleryById);
router.post('/gallery', galleryController.createGallery);
router.put('/gallery/:id', galleryController.updateGallery);
router.delete('/gallery/:id', galleryController.deleteGallery);

module.exports = router;
