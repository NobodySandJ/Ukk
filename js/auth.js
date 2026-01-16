// ================================================================
// FILE: auth.js - Logika Autentikasi & Navigasi
// ================================================================

document.addEventListener('DOMContentLoaded', function () {
    const navLinksContainer = document.getElementById('nav-links');
    const authModal = document.getElementById('auth-modal');

    // ============================================================
    // FUNGSI INISIALISASI APLIKASI
    // Mengatur tampilan navbar berdasarkan status login user
    // ============================================================
    function initializeApp() {
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')) : null;

        // --- Setup Menu Mobile ---
        const navMenu = document.getElementById('nav-menu');
        if (navMenu) {
            let mobileMenuHTML = `
                <button class="mobile-menu-close" id="mobile-menu-close" aria-label="Tutup menu">
                    <i class="fas fa-times"></i>
                </button>
                <ul class="mobile-nav-links">
                    <li><a href="index.html" data-page="index">Beranda</a></li>
                    <li><a href="index.html#members" data-page="index">Member</a></li>
                    <li><a href="cheki.html" data-page="cheki">Cheki</a></li>
                    <li><a href="gallery.html" data-page="gallery">Galeri</a></li>
                </ul>
                <div class="mobile-auth-buttons">
            `;

            // Jika user sudah login, tampilkan tombol Dashboard/Admin
            if (token && userData) {
                const destination = userData.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                const buttonText = userData.peran === 'admin' ? 'Admin Panel' : 'My Dashboard';
                mobileMenuHTML += `
                    <a href="${destination}" class="nav-button cta">
                        <i class="fas fa-th-large"></i> ${buttonText}
                    </a>
                `;
            } else {
                // Jika belum login, tampilkan tombol Login & Register
                mobileMenuHTML += `
                    <a href="#" id="mobile-login-btn" class="nav-button">Login</a>
                    <a href="#" id="mobile-register-btn" class="nav-button cta">Join Us</a>
                `;
            }

            mobileMenuHTML += `</div>`;
            navMenu.innerHTML = mobileMenuHTML;

            // Event listener untuk tombol login/register mobile
            const mobileLoginBtn = document.getElementById('mobile-login-btn');
            const mobileRegisterBtn = document.getElementById('mobile-register-btn');

            if (mobileLoginBtn) {
                mobileLoginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    navMenu.classList.remove('active');
                    if (authModal) {
                        authModal.classList.add('active');
                        document.getElementById('login-view').style.display = 'block';
                        document.getElementById('register-view').style.display = 'none';
                    }
                });
            }

            if (mobileRegisterBtn) {
                mobileRegisterBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    navMenu.classList.remove('active');
                    if (authModal) {
                        authModal.classList.add('active');
                        document.getElementById('login-view').style.display = 'none';
                        document.getElementById('register-view').style.display = 'block';
                    }
                });
            }

            // Tombol tutup menu mobile
            const mobileCloseBtn = document.getElementById('mobile-menu-close');
            if (mobileCloseBtn) {
                mobileCloseBtn.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            }

            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            });
        }

        setActiveNavLink();

        // --- Update Tombol Auth Navbar Desktop ---
        const navAuthButtons = document.querySelector('.nav-auth-buttons');
        if (navAuthButtons) {
            if (token && userData) {
                const destination = userData.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                const buttonText = userData.peran === 'admin' ? 'Admin Panel' : 'My Dashboard';
                navAuthButtons.innerHTML = `
                    <a href="${destination}" class="nav-user-button">
                        <i class="fas fa-th-large"></i>
                        ${buttonText}
                    </a>`;
            } else {
                navAuthButtons.innerHTML = `
                    <a href="#" id="login-btn" class="nav-button">Login</a>
                    <a href="#" id="register-btn" class="nav-button cta">Join Us</a>
                `;
            }
        }
    }

    // ============================================================
    // FUNGSI HIGHLIGHT LINK NAVIGASI AKTIF
    // ============================================================
    function setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const pageMap = {
            'index.html': 'index', '': 'index',
            'cheki.html': 'cheki', 'dashboard.html': 'dashboard',
            'leaderboard.html': 'leaderboard', 'admin.html': 'admin',
            'edit-profile.html': 'edit-profile'
        };
        const currentPageKey = pageMap[currentPage] || 'index';

        // Reset semua link
        const desktopLinks = document.querySelectorAll('ul.nav-links a');
        desktopLinks.forEach(link => link.classList.remove('active'));

        const mobileLinks = document.querySelectorAll('.mobile-nav-links a');
        mobileLinks.forEach(link => link.classList.remove('active'));

        if (currentPageKey === 'index') {
            const berandaLink = document.querySelector('ul.nav-links a[href="#hero"]');
            if (berandaLink) berandaLink.classList.add('active');

            const mobileFirst = document.querySelector('.mobile-nav-links a');
            if (mobileFirst) mobileFirst.classList.add('active');
        } else {
            desktopLinks.forEach(link => {
                if (link.getAttribute('href')?.includes(currentPage)) link.classList.add('active');
            });
            mobileLinks.forEach(link => {
                if (link.getAttribute('href')?.includes(currentPage)) link.classList.add('active');
            });
        }
    }


    // ============================================================
    // KOMPONEN MODAL AUTENTIKASI (LOGIN & REGISTER)
    // Edit bagian ini untuk mengubah tampilan form login/register
    // ============================================================
    if (authModal) {
        authModal.innerHTML = `
        <div class="modal-container">
            <button class="modal-close-btn" id="modal-close-btn">&times;</button>
            
            <!-- ==================== VIEW LOGIN ==================== -->
            <div id="login-view">
                <div class="modal-form-container">
                    <h2>Masuk</h2>
                    <form id="login-form" class="modal-form">
                        <!-- Input Email -->
                        <input type="email" id="login-email" placeholder="Email" required>
                        
                        <!-- Input Password dengan Toggle Visibility -->
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

            <!-- ==================== VIEW REGISTER ==================== -->
            <div id="register-view" style="display: none;">
                <div class="modal-form-container">
                    <h2>Daftar Akun</h2>
                    
                    <!-- Progress Step Registrasi -->
                    <div class="registration-progress" style="display: flex; justify-content: space-between; margin-bottom: 2rem; position: relative;">
                        <div class="progress-step active" data-step="1" title="Info Dasar">
                             <div class="step-circle">1</div><div class="step-label">Info Dasar</div>
                        </div>
                        <div class="progress-step" data-step="2" title="Kontak">
                             <div class="step-circle">2</div><div class="step-label">Kontak</div>
                        </div>
                        <div class="progress-step" data-step="3" title="Keamanan">
                             <div class="step-circle">3</div><div class="step-label">Keamanan</div>
                        </div>
                    </div>

                    <form id="register-form" class="modal-form">
                        <!-- Step 1: Info Dasar -->
                        <div class="form-step active" data-step="1">
                            <input type="text" id="register-username" placeholder="Username" required>
                            <input type="text" id="register-instagram" placeholder="Username Instagram (Opsional)">
                            <button type="button" class="cta-button btn-next">Selanjutnya</button>
                        </div>

                        <!-- Step 2: Kontak -->
                        <div class="form-step" data-step="2" style="display: none;">
                            <input type="email" id="register-email" placeholder="Email Aktif" required>
                            <input type="text" id="register-whatsapp" placeholder="No. WhatsApp (08xxx)" required>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="btn-prev cta-button secondary">Kembali</button>
                                <button type="button" class="cta-button btn-next">Selanjutnya</button>
                            </div>
                        </div>

                        <!-- Step 3: Keamanan & Oshi -->
                        <div class="form-step" data-step="3" style="display: none;">
                            <div class="input-group">
                                <input type="password" id="register-password" placeholder="Password (Min. 6 Karakter)" required>
                                <i id="toggle-register-pass" class="fas fa-eye toggle-pass"></i>
                            </div>
                            <div class="input-group">
                                <input type="password" id="register-confirm-password" placeholder="Konfirmasi Password" required>
                                <i id="toggle-register-confirm-pass" class="fas fa-eye toggle-pass"></i>
                            </div>
                            
                            <!-- Dropdown Pilih Oshi - Edit opsi di sini -->
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <select id="register-oshi" required class="full-width-input">
                                    <option value="" disabled selected>Pilih Oshi Kamu</option>
                                    <option value="Aca">Aca</option>
                                    <option value="Cally">Cally</option>
                                    <option value="Sinta">Sinta</option>
                                    <option value="Piya">Piya</option>
                                    <option value="Yanyee">Yanyee</option>
                                    <option value="Channie">Channie</option>
                                    <option value="Cissi">Cissi</option>
                                </select>
                            </div>
                            
                            <!-- Checkbox Syarat & Ketentuan -->
                            <div class="sk-agreement">
                                <input type="checkbox" id="sk-checkbox" required>
                                <label for="sk-checkbox">Saya setuju dengan <a href="sk.html" target="_blank">Syarat & Ketentuan</a>.</label>
                            </div>

                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="btn-prev cta-button secondary">Kembali</button>
                                <button type="submit" class="cta-button">Daftar</button>
                            </div>
                        </div>

                        <p id="register-error" class="error-message"></p>
                    </form>
                    <p class="modal-switch-link">
                        Sudah punya akun? <a href="#" id="show-login-link">Login di sini</a>
                    </p>
                </div>
            </div>
        </div>`;
    }

    // ============================================================
    // EVENT LISTENERS - Buka/Tutup Modal & Navigasi Form
    // ============================================================
    function setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const closeModalBtn = document.getElementById('modal-close-btn');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        const loginView = document.getElementById('login-view');
        const registerView = document.getElementById('register-view');

        // Buka Modal Login
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

        // Buka Modal Register
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

        // Tutup Modal
        const closeFunc = () => {
            if (authModal) {
                authModal.classList.remove('active');
                resetRegistrationSteps();
            }
        };

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeFunc);
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) closeFunc();
            });
        }

        // Pindah antar view Login <-> Register
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginView.style.display = 'none';
                registerView.style.display = 'block';
                resetRegistrationSteps();
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerView.style.display = 'none';
                loginView.style.display = 'block';
            });
        }

        // Reset step registrasi ke awal
        function resetRegistrationSteps() {
            document.querySelectorAll('.form-step').forEach((fs, index) => {
                fs.style.display = index === 0 ? 'block' : 'none';
            });

            document.querySelectorAll('.progress-step').forEach((ps, index) => {
                const isActive = index === 0;
                ps.classList.toggle('active', isActive);
                const circle = ps.querySelector('.step-circle');
                if (circle) circle.textContent = index + 1;
            });

            const registerForm = document.getElementById('register-form');
            if (registerForm) registerForm.reset();

            const errorMsg = document.getElementById('register-error');
            if (errorMsg) errorMsg.textContent = '';
        }

        // Toggle Visibility Password
        const togglePassword = (btnId, inputId) => {
            const btn = document.getElementById(btnId);
            const input = document.getElementById(inputId);
            if (btn && input) {
                btn.addEventListener('click', () => {
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    btn.classList.toggle('fa-eye');
                    btn.classList.toggle('fa-eye-slash');
                });
            }
        };

        togglePassword('toggle-login-pass', 'login-password');
        togglePassword('toggle-register-pass', 'register-password');
        togglePassword('toggle-register-confirm-pass', 'register-confirm-password');

        // ============================================================
        // NAVIGASI MULTI-STEP REGISTRASI
        // ============================================================
        let currentStep = 1;

        function updateProgress(step) {
            document.querySelectorAll('.progress-step').forEach((ps, index) => {
                if (index + 1 <= step) {
                    ps.classList.add('active');
                    ps.querySelector('.step-circle').style.background = 'var(--primary-color)';
                    ps.querySelector('.step-circle').style.color = 'white';
                } else {
                    ps.classList.remove('active');
                    ps.querySelector('.step-circle').style.background = '#ddd';
                    ps.querySelector('.step-circle').style.color = '#888';
                }
            });
        }

        function showStep(step) {
            document.querySelectorAll('.form-step').forEach(fs => {
                fs.style.display = 'none';
                fs.querySelectorAll('input, select').forEach(input => {
                    if (input.hasAttribute('required')) {
                        input.setAttribute('data-was-required', 'true');
                        input.removeAttribute('required');
                    }
                });
            });

            const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
            if (targetStep) {
                targetStep.style.display = 'block';
                targetStep.querySelectorAll('input, select').forEach(input => {
                    if (input.getAttribute('data-was-required') === 'true') {
                        input.setAttribute('required', 'required');
                    }
                });
            }
            updateProgress(step);
            currentStep = step;
        }

        // ============================================================
        // VALIDASI FORM REGISTRASI PER STEP
        // Edit pesan error atau aturan validasi di sini
        // ============================================================
        function validateStep(step) {
            const errorMsg = document.getElementById('register-error');
            errorMsg.textContent = '';

            if (step === 1) {
                const username = document.getElementById('register-username').value.trim();
                if (!username) { errorMsg.textContent = 'Username wajib diisi!'; return false; }
                if (username.length < 3) { errorMsg.textContent = 'Username minimal 3 karakter!'; return false; }
            } else if (step === 2) {
                const email = document.getElementById('register-email').value.trim();
                const whatsapp = document.getElementById('register-whatsapp').value.trim();

                if (!email) { errorMsg.textContent = 'Email wajib diisi!'; return false; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errorMsg.textContent = 'Format email tidak valid!'; return false; }
                if (!whatsapp) { errorMsg.textContent = 'No. WhatsApp wajib diisi!'; return false; }
                if (!/^08\d{8,11}$/.test(whatsapp)) { errorMsg.textContent = 'No. WhatsApp harus diawali 08 dan 10-13 digit!'; return false; }
            }
            return true;
        }

        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', () => {
                if (validateStep(currentStep) && currentStep < 3) showStep(currentStep + 1);
            });
        });

        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentStep > 1) showStep(currentStep - 1);
            });
        });

        document.querySelectorAll('.progress-step').forEach(stepEl => {
            stepEl.addEventListener('click', () => {
                const targetStep = parseInt(stepEl.getAttribute('data-step'));
                if (targetStep < currentStep) {
                    showStep(targetStep);
                } else if (targetStep > currentStep) {
                    let canProceed = true;
                    for (let i = currentStep; i < targetStep; i++) {
                        if (!validateStep(i)) { canProceed = false; break; }
                    }
                    if (canProceed) showStep(targetStep);
                }
            });
        });
    }

    // ============================================================
    // HANDLER SUBMIT FORM LOGIN & REGISTER
    // Mengirim data ke server API
    // ============================================================
    function setupFormHandlers() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        // --- Handler Login ---
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
                    // Panggil API Login
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Login Gagal');

                    // Simpan token & data user ke localStorage
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('userData', JSON.stringify(data.user));

                    showToast(`Selamat datang, ${data.user.nama_pengguna}!`, 'success');
                    setTimeout(() => {
                        // Redirect berdasarkan role
                        window.location.href = data.user.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                    }, 1000);
                } catch (err) {
                    errorMsg.textContent = err.message;
                    btn.disabled = false;
                    btn.innerHTML = 'Login';
                }
            });
        }

        // --- Handler Register ---
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const errorMsg = document.getElementById('register-error');
                const btn = registerForm.querySelector('button');

                const pass = document.getElementById('register-password').value;
                const confirmPass = document.getElementById('register-confirm-password').value;
                const oshiInput = document.getElementById('register-oshi');

                // Validasi password
                if (pass !== confirmPass) { errorMsg.textContent = 'Password konfirmasi tidak cocok!'; return; }
                if (!oshiInput || !oshiInput.value) { errorMsg.textContent = 'Wajib memilih Oshi!'; return; }

                // Data yang dikirim ke server
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
                    // Panggil API Register
                    const res = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Gagal Mendaftar');

                    showToast('Registrasi Berhasil! Anda akan segera login...', 'success');
                    if (authModal) authModal.classList.remove('active');

                    // Auto-login setelah registrasi
                    setTimeout(async () => {
                        try {
                            const loginRes = await fetch('/api/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: payload.email, password: payload.password })
                            });
                            const loginData = await loginRes.json();
                            if (loginRes.ok) {
                                localStorage.setItem('userToken', loginData.token);
                                localStorage.setItem('userData', JSON.stringify(loginData.user));
                                window.location.href = loginData.user.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                            }
                        } catch (err) {
                            console.error('Auto-login failed:', err);
                            showToast('Silakan login manual', 'info');
                        }
                    }, 1500);

                } catch (err) {
                    errorMsg.textContent = err.message;
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Daftar';
                }
            });
        }
    }

    // Jalankan semua fungsi inisialisasi
    initializeApp();
    setupEventListeners();
    setupFormHandlers();
});