const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

// Public route (mounted at /api/public?)
// server.js: app.get("/api/public/next-event", ...)
// If I mount this router at /api, then I need path /public/next-event.
// But Create Event is /api/admin/events.

// I will define specific paths here to match server.js structure when mounted at /api.

// Public
router.get('/public/next-event', eventController.getNextEvent);

// Admin
router.get('/admin/events', authenticateToken, authorizeAdmin, eventController.getEvents);
router.post('/admin/events', authenticateToken, authorizeAdmin, eventController.createEvent);

module.exports = router;
