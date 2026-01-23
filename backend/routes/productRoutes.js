const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Helper to allow public access to leaderboard but also maybe auth?
// Original server.js: app.get("/api/leaderboard", async...) -> No Auth Middleware
// app.get("/api/products-and-stock", async...) -> No Auth Middleware
// So these are public routes.

router.get('/products-and-stock', productController.getProductsAndStock);
router.get('/leaderboard', productController.getGlobalLeaderboard);
router.get('/leaderboard-per-member', productController.getMemberLeaderboard);
router.get('/public/gallery', productController.getGalleryImages);

module.exports = router;
