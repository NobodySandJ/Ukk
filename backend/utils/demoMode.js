// Centralized Demo Mode Logic
const isDemoMode = !process.env.JWT_SECRET;

module.exports = { isDemoMode };
