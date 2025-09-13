// js/auth.js (Versi Optimal)

document.addEventListener('DOMContentLoaded', function() {
    const navLinksContainer = document.getElementById('nav-links');
    const token = localStorage.getItem('userToken');

    // Fungsi ini akan dijalankan untuk membuat navigasi dan memasang semua event listener
    function initializeNavigationAndAuth() {
        // 1. Buat HTML navigasi berdasarkan status login
        let navHTML = `
            <li><a href="index.html#about">Tentang Kami</a></li>
            <li><a href="index.html#members">Member</a></li>
            <li><a href="index.html#news">Berita</a></li>
            <li><a href="gallery.html">Galeri</a></li>
            <li><a href="cheki.html">Pesan Cheki</a></li>
        `;

        if (token) {
            navHTML += `
                <li><a href="dashboard.html" title="Akun Saya"><i class="fas fa-user-circle" style="font-size: 1.5rem;"></i></a></li>
                <li><a href="#" id="logout-btn" title="Logout"><i class="fas fa-sign-out-alt" style="font-size: 1.5rem;"></i></a></li>
            `;
        } else {
            navHTML += `
                <li><a href="#" id="auth-icon-btn" title="Login/Daftar"><i class="fas fa-user-circle" style="font-size: 1.5rem;"></i></a></li>
            `;
        }
        navLinksContainer.innerHTML = navHTML;

        // 2. SETELAH HTML dibuat, cari tombol-tombolnya dan pasang listener
        const authIconBtn = document.getElementById('auth-icon-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const authModal = document.getElementById('auth-modal');

        // Pasang listener untuk BUKA MODAL
        if (authIconBtn && authModal) {
            authIconBtn.addEventListener('click', (e) => {
                e.preventDefault();
                authModal.classList.add('active');
            });
        }

        // Pasang listener untuk LOGOUT
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                window.location.href = 'index.html';
            });
        }
    }
    
    // --- Logika untuk mengelola Pop-up Modal itu sendiri ---
    function setupModal() {
        const authModal = document.getElementById('auth-modal');
        if (!authModal) return;

        const closeModalBtn = document.getElementById('modal-close-btn');
        const loginView = document.getElementById('login-view');
        const registerView = document.getElementById('register-view');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        // Tutup modal
        closeModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('active');
            }
        });

        // Beralih ke Register
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'none';
            registerView.style.display = 'block';
        });

        // Beralih ke Login
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerView.style.display = 'none';
            loginView.style.display = 'block';
        });
        
        // Handle form login
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formError = document.getElementById('login-error');
            const submitButton = loginForm.querySelector('button');
            const loginData = {
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value
            };
            submitButton.disabled = true;
            submitButton.textContent = 'Masuk...';
            formError.textContent = '';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Login gagal.');
                
                localStorage.setItem('userToken', result.token);
                localStorage.setItem('userData', JSON.stringify(result.user));
                window.location.reload();
            } catch (error) {
                formError.textContent = error.message;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        });

        // Handle form register
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formError = document.getElementById('register-error');
            const submitButton = registerForm.querySelector('button');
            const userData = {
                username: document.getElementById('register-username').value,
                email: document.getElementById('register-email').value,
                password: document.getElementById('register-password').value,
                whatsapp_number: document.getElementById('register-whatsapp').value,
                instagram_username: document.getElementById('register-instagram').value,
            };

            submitButton.disabled = true;
            submitButton.textContent = 'Mendaftar...';
            formError.textContent = '';

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal mendaftar.');
                
                alert('Pendaftaran berhasil! Silakan login.');
                loginView.style.display = 'block';
                registerView.style.display = 'none';
            } catch (error) {
                formError.textContent = error.message;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Daftar';
            }
        });
    }

    // --- PANGGIL SEMUA FUNGSI INISIALISASI ---
    initializeNavigationAndAuth();
    setupModal();
});