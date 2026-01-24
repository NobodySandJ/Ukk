const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);

// Password Reset Routes
router.post('/verify-and-generate-otp', authController.verifyAndGenerateOTP);
router.post('/reset-password-with-code', authController.resetPasswordWithCode);

module.exports = router;
