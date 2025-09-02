// public/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const stockForm = document.getElementById('stock-form');
    const currentStockEl = document.getElementById('current-stock');
    const updateStatusEl = document.getElementById('update-status');
    const logoutBtn = document.getElementById('logout-btn');

    const API_TOKEN_KEY = 'admin_api_token';

    // === Functions ===
    function showAdminPanel() {
        loginSection.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        fetchCurrentStock();
    }

    function showLoginSection() {
        adminPanel.classList.add('hidden');
        loginSection.classList.remove('hidden');
        loginForm.reset();
    }

    async function fetchCurrentStock() {
        currentStockEl.textContent = "Memuat...";
        try {
            const response = await fetch('/api/get-stock');
            if (!response.ok) {
                throw new Error('Gagal mengambil data stok.');
            }
            const data = await response.json();
            currentStockEl.textContent = data.stock;
        } catch (error) {
            currentStockEl.textContent = 'Error';
            updateStatusEl.textContent = error.message;
            updateStatusEl.className = 'text-red-400 text-center mt-4';
        }
    }
    
    // === Event Listeners ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const username = e.target.username.value;
        const password = e.target.password.value;

        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Username atau password salah.');
            }
            
            // Simpan token ke session storage (lebih aman dari local storage)
            sessionStorage.setItem(API_TOKEN_KEY, result.token);
            showAdminPanel();

        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    stockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        updateStatusEl.textContent = 'Memperbarui...';
        updateStatusEl.className = 'text-yellow-400 text-center mt-4';

        const stockToAdd = parseInt(e.target['stock-to-add'].value);
        const token = sessionStorage.getItem(API_TOKEN_KEY);

        if (isNaN(stockToAdd) || stockToAdd <= 0) {
            updateStatusEl.textContent = 'Harap masukkan jumlah yang valid.';
            updateStatusEl.className = 'text-red-400 text-center mt-4';
            return;
        }
        
        try {
            const response = await fetch('/api/update-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Kirim token untuk otorisasi
                },
                body: JSON.stringify({ add: stockToAdd })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal memperbarui stok.');
            }

            updateStatusEl.textContent = 'Stok berhasil diperbarui!';
            updateStatusEl.className = 'text-green-400 text-center mt-4';
            stockForm.reset();
            fetchCurrentStock(); // Ambil ulang stok terbaru

        } catch (error) {
            updateStatusEl.textContent = error.message;
            updateStatusEl.className = 'text-red-400 text-center mt-4';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem(API_TOKEN_KEY);
        showLoginSection();
    });

    // === Initial Check ===
    // Cek jika sudah ada token di session storage saat halaman dimuat
    if (sessionStorage.getItem(API_TOKEN_KEY)) {
        showAdminPanel();
    } else {
        showLoginSection();
    }
});