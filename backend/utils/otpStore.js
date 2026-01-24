// Shared In-Memory OTP Storage
// Used by authController (Public Reset) and adminController (Admin Reset)

const otpStorage = new Map();

module.exports = otpStorage;
