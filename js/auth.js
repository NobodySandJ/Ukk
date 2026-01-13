// File: js/auth.js
// VERSI FINAL: Dengan Input Oshi

document.addEventListener('DOMContentLoaded', function () {
    const navLinksContainer = document.getElementById('nav-links');
    const authModal = document.getElementById('auth-modal');

    // Cek jika elemen modal ada
    if (!authModal) return;

    // --- STRUKTUR HTML MODAL DIPERBARUI ---
    authModal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close-btn" id="modal-close-btn">&times;</button>
            
            <div id="login-view">
                <div class="modal-form-container">
                    <h2>Login Akun</h2>
                    <form id="login-form" class="modal-form">
                        <input type="email" id="login-email" placeholder="Email" required>
                        
                        <div style="position: relative; width: 100%;">
                            <input type="password" id="login-password" placeholder="Password" required style="padding-right: 40px; width: 100%;">
                            <i id="toggle-login-pass" class="fas fa-eye" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #888;"></i>
                        </div>

                        <a href="forgot-password.html" style="text-align: right; font-size: 0.9em; margin-top: 0.5rem;">Lupa Sandi?</a>
                        <button type="submit" class="cta-button">Login</button>
                        <p id="login-error" class="error-message" style="text-align: center;"></p>
                    </form>
                    <p class="modal-switch-link">
                        Belum punya akun? <a id="show-register-link">Daftar di sini</a>
                    </p>
                </div>
            </div>

            <div id="register-view" style="display: none;">
                <div class="modal-form-container">
                    <h2>Buat Akun Baru</h2>
                    <form id="register-form" class="modal-form">
                        <input type="text" id="register-username" placeholder="Username" required>
                        <input type="email" id="register-email" placeholder="Email Aktif" required>
                        
                        <input type="password" id="register-password" placeholder="Password" required>
                        <input type="password" id="register-confirm-password" placeholder="Konfirmasi Password" required>

                        <input type="text" id="register-whatsapp" placeholder="No. WhatsApp" required>
                        
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
                        
                        <div class="sk-agreement">
                            <input type="checkbox" id="sk-checkbox" required>
                            <label for="sk-checkbox">Saya setuju dengan <a href="sk.html" target="_blank">Syarat & Ketentuan</a>.</label>
                        </div>
                        <button type="submit" class="cta-button">Daftar</button>
                        <p id="register-error" class="error-message" style="text-align: center;"></p>
                    </form>
                    <p class="modal-switch-link">
                        Sudah punya akun? <a id="show-login-link">Login di sini</a>
                    </p>
                </div>
            </div>
        </div>`;

    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');

    function initializeApp() {
        if (!navLinksContainer) return;
        
        // Setup navbar menu
        let navHTML = `
            <li><a href="index.html#hero">Tentang Kami</a></li>
            <li><a href="index.html#members">Member</a></li>
            <li><a href="index.html#news">News</a></li>
        `;
        navLinksContainer.innerHTML = navHTML;
    
        // Update ikon user jika sudah login
        const navAuthButtons = document.querySelector('.nav-auth-buttons');
        if (token && userData && navAuthButtons) {
            const destination = userData.peran === 'admin' ? 'admin.html' : 'dashboard.html';
            navAuthButtons.innerHTML = `<a href="${destination}" title="Akun Saya" class="nav-user-icon"><i class="fas fa-user-circle"></i></a>`;
            const style = document.createElement('style');
            style.innerHTML = `.nav-user-icon { color: var(--text-color); font-size: 2rem; }`;
            document.head.appendChild(style);
        }
    }

    function setupModalListeners() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const closeModalBtn = document.getElementById('modal-close-btn');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');

        // --- FITUR SHOW/HIDE PASSWORD LOGIN ---
        const toggleLoginPassBtn = document.getElementById('toggle-login-pass');
        const loginPassInput = document.getElementById('login-password');

        if (toggleLoginPassBtn && loginPassInput) {
            toggleLoginPassBtn.addEventListener('click', () => {
                const type = loginPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
                loginPassInput.setAttribute('type', type);
                
                // Toggle icon class
                toggleLoginPassBtn.classList.toggle('fa-eye');
                toggleLoginPassBtn.classList.toggle('fa-eye-slash');
            });
        }

        // Event Listeners Modal Navigasi
        loginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'block';
            registerView.style.display = 'none';
            authModal.classList.add('active');
        });

        registerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'none';
            registerView.style.display = 'block';
            authModal.classList.add('active');
        });

        closeModalBtn?.addEventListener('click', () => authModal.classList.remove('active'));
        
        // Klik di luar modal untuk menutup
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) authModal.classList.remove('active');
        });

        // Switch antar Login/Register di dalam modal
        showRegisterLink?.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'none';
            registerView.style.display = 'block';
        });

        showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            registerView.style.display = 'none';
            loginView.style.display = 'block';
        });
    }

    function setupFormHandlers() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        // --- HANDLER LOGIN ---
        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formError = document.getElementById('login-error');
            const submitButton = loginForm.querySelector('button');
            const loginData = {
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value
            };
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';
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
                
                if (typeof showToast === 'function') {
                    showToast(`Login berhasil! Selamat datang, ${result.user.nama_pengguna}!`);
                }

                setTimeout(() => {
                    window.location.href = result.user?.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                }, 1500);

            } catch (error) {
                formError.textContent = error.message;
                submitButton.disabled = false;
                submitButton.innerHTML = 'Login';
            }
        });

        // --- HANDLER REGISTER ---
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formError = document.getElementById('register-error');
            const submitButton = registerForm.querySelector('button');
            
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            // VALIDASI: Cek kesamaan password
            if (password !== confirmPassword) {
                formError.textContent = "Konfirmasi password tidak sesuai!";
                return;
            }

            const userData = {
                username: document.getElementById('register-username').value,
                email: document.getElementById('register-email').value,
                password: password,
                whatsapp_number: document.getElementById('register-whatsapp').value,
                // UPDATE: Mengambil nilai Oshi
                oshi: document.getElementById('register-oshi').value,
                instagram_username: document.getElementById('register-instagram').value || null,
            };

            // Validasi Oshi wajib dipilih
            if (!userData.oshi) {
                formError.textContent = "Silakan pilih Oshi kamu!";
                return;
            }

            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendaftar...';
            formError.textContent = '';

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal mendaftar.');

                if (typeof showToast === 'function') {
                    showToast('Pendaftaran berhasil! Silakan login.');
                }
                registerForm.reset();
                loginView.style.display = 'block';
                registerView.style.display = 'none';

            } catch (error) {
                formError.textContent = error.message;
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Daftar';
            }
        });
    }

    initializeApp();
    setupModalListeners();
    setupFormHandlers();
});