const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Password Reset Routes
router.post('/verify-and-generate-otp', authController.verifyAndGenerateOTP);
router.post('/reset-password-with-code', authController.resetPasswordWithCode);

module.exports = router;
