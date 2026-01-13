// File: js/auth.js
// VERSI FINAL: Perbaikan Layout Index & Input Oshi

document.addEventListener('DOMContentLoaded', function () {
    const navLinksContainer = document.getElementById('nav-links');
    const authModal = document.getElementById('auth-modal');

    // --- 1. INISIALISASI APLIKASI & NAVBAR ---
    function initializeApp() {
        // Cek Login State dari LocalStorage
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')) : null;

        // Render Menu Navbar (Pastikan tidak merusak jika sudah ada isinya)
        if (navLinksContainer) {
            navLinksContainer.innerHTML = `
                <li><a href="index.html#hero">Tentang Kami</a></li>
                <li><a href="index.html#members">Member</a></li>
                <li><a href="index.html#news">News</a></li>
            `;
        }

        // Update Tombol Auth (Login/Register vs User Icon)
        const navAuthButtons = document.querySelector('.nav-auth-buttons');
        if (navAuthButtons) {
            if (token && userData) {
                // Jika sudah login, tampilkan ikon user
                const destination = userData.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                navAuthButtons.innerHTML = `
                    <a href="${destination}" title="Halo, ${userData.nama_pengguna}" class="nav-user-icon">
                        <i class="fas fa-user-circle" style="font-size: 1.8rem; color: #333;"></i>
                    </a>`;
            } else {
                // Jika belum login, tampilkan tombol default (pastikan ID ada untuk event listener)
                navAuthButtons.innerHTML = `
                    <a href="#" id="login-btn" class="btn-login">Login</a>
                    <a href="#" id="register-btn" class="btn-register">Join Us</a>
                `;
            }
        }
    }

    // --- 2. RENDER MODAL HTML ---
    if (authModal) {
        authModal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close-btn" id="modal-close-btn">&times;</button>
            
            <div id="login-view">
                <div class="modal-form-container">
                    <h2>Login Akun</h2>
                    <form id="login-form" class="modal-form">
                        <input type="email" id="login-email" placeholder="Email" required>
                        
                        <div style="position: relative; width: 100%;">
                            <input type="password" id="login-password" placeholder="Password" required style="width: 100%; padding-right: 40px;">
                            <i id="toggle-login-pass" class="fas fa-eye" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #888;"></i>
                        </div>

                        <a href="forgot-password.html" style="display:block; text-align: right; font-size: 0.9em; margin-top: 0.5rem; color: #666;">Lupa Sandi?</a>
                        <button type="submit" class="cta-button" style="margin-top: 1rem;">Login</button>
                        <p id="login-error" class="error-message" style="text-align: center; color: red; margin-top: 0.5rem;"></p>
                    </form>
                    <p class="modal-switch-link">
                        Belum punya akun? <a href="#" id="show-register-link">Daftar di sini</a>
                    </p>
                </div>
            </div>

            <div id="register-view" style="display: none;">
                <div class="modal-form-container">
                    <h2>Buat Akun Baru</h2>
                    <form id="register-form" class="modal-form">
                        <input type="text" id="register-username" placeholder="Username" required>
                        <input type="email" id="register-email" placeholder="Email Aktif" required>
                        
                        <input type="password" id="register-password" placeholder="Password (Min. 6 Karakter)" required>
                        <input type="password" id="register-confirm-password" placeholder="Konfirmasi Password" required>

                        <input type="text" id="register-whatsapp" placeholder="No. WhatsApp (08xxx)" required>
                        
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <select id="register-oshi" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff;">
                                <option value="" disabled selected>Pilih Oshi Kamu</option>
                                <option value="Aca">Aca</option>
                                <option value="Cally">Cally</option>
                                <option value="Sinta">Sinta</option>
                                <option value="Piya">Piya</option>
                                <option value="Yanyee">Yanyee</option>
                                <option value="Channie">Channie</option>
                                <option value="Cissi">Cissi</option>
                                <option value="All Member">All Member (DD)</option>
                            </select>
                        </div>

                        <input type="text" id="register-instagram" placeholder="Username Instagram (Opsional)">
                        
                        <div class="sk-agreement" style="display: flex; align-items: center; gap: 8px; margin-bottom: 1rem;">
                            <input type="checkbox" id="sk-checkbox" required>
                            <label for="sk-checkbox" style="font-size: 0.85rem;">Saya setuju dengan <a href="sk.html" target="_blank">Syarat & Ketentuan</a>.</label>
                        </div>
                        <button type="submit" class="cta-button">Daftar</button>
                        <p id="register-error" class="error-message" style="text-align: center; color: red; margin-top: 0.5rem;"></p>
                    </form>
                    <p class="modal-switch-link">
                        Sudah punya akun? <a href="#" id="show-login-link">Login di sini</a>
                    </p>
                </div>
            </div>
        </div>`;
    }

    // --- 3. EVENT LISTENERS ---
    function setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const closeModalBtn = document.getElementById('modal-close-btn');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        const loginView = document.getElementById('login-view');
        const registerView = document.getElementById('register-view');

        // Toggle Modal
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (authModal) {
                    authModal.classList.add('active');
                    loginView.style.display = 'block';
                    registerView.style.display = 'none';
                }
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (authModal) {
                    authModal.classList.add('active');
                    loginView.style.display = 'none';
                    registerView.style.display = 'block';
                }
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
        }

        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) authModal.classList.remove('active');
            });
        }

        // Switch Forms
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginView.style.display = 'none';
                registerView.style.display = 'block';
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerView.style.display = 'none';
                loginView.style.display = 'block';
            });
        }

        // Show/Hide Password
        const togglePassBtn = document.getElementById('toggle-login-pass');
        const passInput = document.getElementById('login-password');
        if (togglePassBtn && passInput) {
            togglePassBtn.addEventListener('click', () => {
                const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passInput.setAttribute('type', type);
                togglePassBtn.classList.toggle('fa-eye');
                togglePassBtn.classList.toggle('fa-eye-slash');
            });
        }
    }

    // --- 4. FORM HANDLERS (LOGIKA SERVER) ---
    function setupFormHandlers() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        // Login
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const errorMsg = document.getElementById('login-error');
                const btn = loginForm.querySelector('button');
                
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;

                btn.disabled = true;
                btn.innerHTML = 'Loading...';
                errorMsg.textContent = '';

                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    
                    if (!res.ok) throw new Error(data.message || 'Login Gagal');

                    // Simpan Token & Data User
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('userData', JSON.stringify(data.user));

                    alert(`Selamat datang, ${data.user.nama_pengguna}!`);
                    window.location.href = data.user.peran === 'admin' ? 'admin.html' : 'dashboard.html';

                } catch (err) {
                    errorMsg.textContent = err.message;
                    btn.disabled = false;
                    btn.innerHTML = 'Login';
                }
            });
        }

        // Register
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const errorMsg = document.getElementById('register-error');
                const btn = registerForm.querySelector('button');

                const pass = document.getElementById('register-password').value;
                const confirmPass = document.getElementById('register-confirm-password').value;
                const oshiInput = document.getElementById('register-oshi');

                if (pass !== confirmPass) {
                    errorMsg.textContent = 'Password konfirmasi tidak cocok!';
                    return;
                }
                
                if (!oshiInput || !oshiInput.value) {
                    errorMsg.textContent = 'Wajib memilih Oshi!';
                    return;
                }

                const payload = {
                    username: document.getElementById('register-username').value,
                    email: document.getElementById('register-email').value,
                    password: pass,
                    whatsapp_number: document.getElementById('register-whatsapp').value,
                    oshi: oshiInput.value,
                    instagram_username: document.getElementById('register-instagram').value || ''
                };

                btn.disabled = true;
                btn.innerHTML = 'Mendaftar...';
                errorMsg.textContent = '';

                try {
                    const res = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();

                    if (!res.ok) throw new Error(data.message || 'Gagal Mendaftar');

                    alert('Registrasi Berhasil! Silakan Login.');
                    registerForm.reset();
                    // Pindah ke tampilan login
                    document.getElementById('register-view').style.display = 'none';
                    document.getElementById('login-view').style.display = 'block';

                } catch (err) {
                    errorMsg.textContent = err.message;
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Daftar';
                }
            });
        }
    }

    // Jalankan Semua Fungsi
    initializeApp();
    setupEventListeners(); // Panggil ini SETELAH initializeApp agar tombol login/register (jika ada) terdeteksi
    setupFormHandlers();
});