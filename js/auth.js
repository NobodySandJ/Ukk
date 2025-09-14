// js/auth.js (Perbaikan Final & Optimal)

document.addEventListener('DOMContentLoaded', function() {
    // Pastikan elemen dasar ada sebelum melanjutkan
    const navLinksContainer = document.getElementById('nav-links');
    if (!navLinksContainer) {
        console.error('Elemen navigasi #nav-links tidak ditemukan!');
        return;
    }

    const token = localStorage.getItem('userToken');

    // --- FUNGSI UTAMA: Membuat Navigasi & Memasang Listener ---
    function initializeApp() {
        // 1. Buat HTML Navigasi
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
        
        // 2. Tampilkan HTML ke Halaman
        navLinksContainer.innerHTML = navHTML;

        // 3. SEKARANG, cari elemen yang BARU DIBUAT dan pasang listener
        const authIconBtn = document.getElementById('auth-icon-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const authModal = document.getElementById('auth-modal');

        if (authIconBtn && authModal) {
            authIconBtn.addEventListener('click', (e) => {
                e.preventDefault();
                authModal.classList.add('active');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                window.location.href = 'index.html';
            });
        }
    }

    // --- Fungsi untuk mengelola logika internal Modal ---
    function setupModalListeners() {
        const authModal = document.getElementById('auth-modal');
        if (!authModal) return;

        const closeModalBtn = document.getElementById('modal-close-btn');
        const loginView = document.getElementById('login-view');
        const registerView = document.getElementById('register-view');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        
        // Listener untuk menutup modal
        // **FIX:** Only add listeners if the elements exist
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
        }
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('active');
            }
        });

        // Listener untuk beralih form
        if (showRegisterLink && loginView && registerView) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginView.style.display = 'none';
                registerView.style.display = 'block';
            });
        }
        if (showLoginLink && loginView && registerView) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerView.style.display = 'none';
                loginView.style.display = 'block';
            });
        }
    }

    // --- Fungsi untuk menangani submit form ---
    function setupFormHandlers() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
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

                    if (result.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } catch (error) {
                    formError.textContent = error.message;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                }
            });
        }

        if (registerForm) {
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
                    // Switch to login view after successful registration
                    const loginView = document.getElementById('login-view');
                    const registerView = document.getElementById('register-view');
                    if(loginView && registerView) {
                        loginView.style.display = 'block';
                        registerView.style.display = 'none';
                    }
                } catch (error) {
                    formError.textContent = error.message;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Daftar';
                }
            });
        }
    }

    // --- JALANKAN SEMUA FUNGSI ---
    initializeApp();
    setupModalListeners();
    setupFormHandlers();
});