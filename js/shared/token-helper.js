// ================================================================
// TOKEN HELPER - Utility untuk menangani token authentication
// ================================================================

/**
 * Cek apakah token valid (belum expired)
 * @param {string} token - JWT token
 * @returns {boolean} - true jika valid, false jika expired/invalid
 */
function isTokenValid(token) {
    if (!token) return false;
    
    try {
        // Parse JWT token (format: header.payload.signature)
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        // Decode payload (base64)
        const payload = JSON.parse(atob(parts[1]));
        
        // Check expiration time
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        }
        
        return true;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

/**
 * Clear all authentication data dari localStorage
 */
function clearAuthData() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
}

/**
 * Auto-check token validity on page load
 * Redirect ke home jika token invalid
 */
function validateAuthOnLoad() {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    
    if (token && !isTokenValid(token)) {
        console.warn('Token expired or invalid. Clearing authentication data...');
        clearAuthData();
        
        // Show message to user
        if (typeof showToast === 'function') {
            showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
        }
        
        // Redirect after delay
        setTimeout(() => {
            const basePath = window.appBasePath || './';
            window.location.href = `${basePath}index.html`;
        }, 2000);
        
        return false;
    }
    
    return true;
}

/**
 * Get token expiration time in readable format
 * @param {string} token - JWT token
 * @returns {string} - Formatted expiration time
 */
function getTokenExpiration(token) {
    if (!token) return 'N/A';
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return 'Invalid token';
        
        const payload = JSON.parse(atob(parts[1]));
        
        if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            return expDate.toLocaleString('id-ID');
        }
        
        return 'No expiration';
    } catch (error) {
        return 'Error parsing token';
    }
}

// Export functions untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isTokenValid,
        clearAuthData,
        validateAuthOnLoad,
        getTokenExpiration
    };
}
