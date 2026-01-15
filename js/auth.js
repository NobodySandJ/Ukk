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

        // Populate Mobile Menu
        const navMenu = document.getElementById('nav-menu');
        if (navMenu) {
            // Build mobile menu content with close button
            let mobileMenuHTML = `
                <button class="mobile-menu-close" id="mobile-menu-close" aria-label="Tutup menu">
                    <i class="fas fa-times"></i>
                </button>
                <ul class="mobile-nav-links">
                    <li><a href="index.html#hero" data-page="index">Beranda</a></li>
                    <li><a href="index.html#about" data-page="index">Tentang</a></li>
                    <li><a href="index.html#members" data-page="index">Member</a></li>
                    <li><a href="index.html#news" data-page="index">Berita</a></li>
                </ul>
                <div class="mobile-auth-buttons">
            `;

            if (token && userData) {
                const destination = userData.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                const buttonText = userData.peran === 'admin' ? 'Admin Panel' : 'My Dashboard';
                mobileMenuHTML += `
                    <a href="${destination}" class="nav-button cta">
                        <i class="fas fa-th-large"></i> ${buttonText}
                    </a>
                `;
            } else {
                mobileMenuHTML += `
                    <a href="#" id="mobile-login-btn" class="nav-button">Login</a>
                    <a href="#" id="mobile-register-btn" class="nav-button cta">Join Us</a>
                `;
            }

            mobileMenuHTML += `</div>`;
            navMenu.innerHTML = mobileMenuHTML;

            // Add event listeners for mobile auth buttons
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

            // Add close button event listener
            const mobileCloseBtn = document.getElementById('mobile-menu-close');
            if (mobileCloseBtn) {
                mobileCloseBtn.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            }

            // Close menu when clicking on a link
            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            });
        }

        // Set Active Page Indicator
        setActiveNavLink();

        // Update Tombol Auth (Login/Register vs Dashboard Button) - Desktop
        const navAuthButtons = document.querySelector('.nav-auth-buttons');
        if (navAuthButtons) {
            if (token && userData) {
                // Jika sudah login, tampilkan tombol "My Dashboard"
                const destination = userData.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                const buttonText = userData.peran === 'admin' ? 'Admin Panel' : 'My Dashboard';
                navAuthButtons.innerHTML = `
                    <a href="${destination}" class="nav-user-button">
                        <i class="fas fa-th-large"></i>
                        ${buttonText}
                    </a>`;
            } else {
                // Jika belum login, tampilkan tombol login/register
                navAuthButtons.innerHTML = `
                    <a href="#" id="login-btn" class="nav-button">Login</a>
                    <a href="#" id="register-btn" class="nav-button cta">Join Us</a>
                `;
            }
        }
    }

    // --- ACTIVE PAGE INDICATOR ---
    function setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const currentHash = window.location.hash;
        const pageMap = {
            'index.html': 'index',
            '': 'index', // root path
            'cheki.html': 'cheki',
            'dashboard.html': 'dashboard',
            'leaderboard.html': 'leaderboard',
            'admin.html': 'admin',
            'edit-profile.html': 'edit-profile'
        };
        const currentPageKey = pageMap[currentPage] || 'index';

        // Desktop nav links - Only mark ONE link as active
        const desktopLinks = document.querySelectorAll('ul.nav-links a');
        desktopLinks.forEach(link => link.classList.remove('active'));

        if (currentPageKey === 'index') {
            // On index page, mark "Beranda" as active (first link)
            const berandaLink = document.querySelector('ul.nav-links a[href="#hero"]');
            if (berandaLink) {
                berandaLink.classList.add('active');
            }
        } else if (currentPageKey === 'leaderboard') {
            // No specific link for leaderboard in navbar, so no active state
        } else if (currentPageKey === 'cheki') {
            // Cheki removed from navbar, no active state
        } else {
            // For other pages, find matching link
            desktopLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.includes(currentPage)) {
                    link.classList.add('active');
                }
            });
        }

        // Mobile nav links - Same logic
        const mobileLinks = document.querySelectorAll('.mobile-nav-links a');
        mobileLinks.forEach(link => link.classList.remove('active'));

        if (currentPageKey === 'index') {
            // On index page, mark first link as active
            const firstLink = document.querySelector('.mobile-nav-links a');
            if (firstLink) {
                firstLink.classList.add('active');
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
                    <h2>Masuk</h2>
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
                    <h2>Daftar Akun</h2>
                    
                    <!-- Progress Indicator (Clickable) -->
                    <div class="registration-progress" style="display: flex; justify-content: space-between; margin-bottom: 2rem; position: relative;">
                        <div class="progress-step active" data-step="1" style="flex: 1; text-align: center; position: relative; cursor: pointer;" title="Info Dasar">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: var(--primary-color); color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-bottom: 0.5rem; transition: all 0.3s;">1</div>
                            <div style="font-size: 0.75rem; color: var(--primary-color);">Info Dasar</div>
                        </div>
                        <div class="progress-step" data-step="2" style="flex: 1; text-align: center; position: relative; cursor: pointer;" title="Kontak">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: #ddd; color: #888; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-bottom: 0.5rem; transition: all 0.3s;">2</div>
                            <div style="font-size: 0.75rem; color: #888;">Kontak</div>
                        </div>
                        <div class="progress-step" data-step="3" style="flex: 1; text-align: center; position: relative; cursor: pointer;" title="Keamanan">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: #ddd; color: #888; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-bottom: 0.5rem; transition: all 0.3s;">3</div>
                            <div style="font-size: 0.75rem; color: #888;">Keamanan</div>
                        </div>
                    </div>

                    <form id="register-form" class="modal-form">
                        <!-- Step 1: Username & Instagram -->
                        <div class="form-step active" data-step="1">
                            <input type="text" id="register-username" placeholder="Username" required>
                            <input type="text" id="register-instagram" placeholder="Username Instagram (Opsional)">
                            <button type="button" class="cta-button btn-next">Selanjutnya</button>
                        </div>

                        <!-- Step 2: Email & WhatsApp -->
                        <div class="form-step" data-step="2" style="display: none;">
                            <input type="email" id="register-email" placeholder="Email Aktif" required>
                            <input type="text" id="register-whatsapp" placeholder="No. WhatsApp (08xxx)" required>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="btn-prev cta-button" style="flex: 1; background: white; color: var(--primary-color); border: 1px solid var(--primary-color);">Kembali</button>
                                <button type="button" class="cta-button btn-next" style="flex: 1;">Selanjutnya</button>
                            </div>
                        </div>

                        <!-- Step 3: Password & Oshi -->
                        <div class="form-step" data-step="3" style="display: none;">
                            <div style="position: relative; width: 100%; margin-bottom: 1rem;">
                                <input type="password" id="register-password" placeholder="Password (Min. 6 Karakter)" required style="width: 100%; padding-right: 40px;">
                                <i id="toggle-register-pass" class="fas fa-eye" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #888;"></i>
                            </div>
                            <div style="position: relative; width: 100%; margin-bottom: 1rem;">
                                <input type="password" id="register-confirm-password" placeholder="Konfirmasi Password" required style="width: 100%; padding-right: 40px;">
                                <i id="toggle-register-confirm-pass" class="fas fa-eye" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #888;"></i>
                            </div>
                            
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
                                </select>
                            </div>
                            
                            <div class="sk-agreement" style="display: flex; align-items: center; gap: 8px; margin-bottom: 1rem;">
                                <input type="checkbox" id="sk-checkbox" required>
                                <label for="sk-checkbox" style="font-size: 0.85rem;">Saya setuju dengan <a href="sk.html" target="_blank">Syarat & Ketentuan</a>.</label>
                            </div>

                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="btn-prev cta-button" style="flex: 1; background: white; color: var(--primary-color); border: 1px solid var(--primary-color);">Kembali</button>
                                <button type="submit" class="cta-button" style="flex: 1;">Daftar</button>
                            </div>
                        </div>

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
            closeModalBtn.addEventListener('click', () => {
                authModal.classList.remove('active');
                resetRegistrationSteps();
            });
        }

        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) {
                    authModal.classList.remove('active');
                    resetRegistrationSteps();
                }
            });
        }

        // Switch Forms
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

        // Function to reset registration steps
        function resetRegistrationSteps() {
            const formSteps = document.querySelectorAll('.form-step');
            formSteps.forEach((fs, index) => {
                fs.style.display = index === 0 ? 'block' : 'none';
            });

            const progressSteps = document.querySelectorAll('.progress-step');
            progressSteps.forEach((ps, index) => {
                const stepNum = index + 1;
                const circle = ps.querySelector('div:first-child');
                const text = ps.querySelector('div:last-child');

                if (stepNum === 1) {
                    circle.style.background = 'var(--primary-color)';
                    circle.style.color = 'white';
                    text.style.color = 'var(--primary-color)';
                } else {
                    circle.style.background = '#ddd';
                    circle.style.color = '#888';
                    text.style.color = '#888';
                }
            });

            // Clear all form fields
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.reset();
            }

            // Reset error message
            const errorMsg = document.getElementById('register-error');
            if (errorMsg) errorMsg.textContent = '';
        }


        // Show/Hide Password - Login
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

        // Show/Hide Password - Register (Password)
        const toggleRegisterPassBtn = document.getElementById('toggle-register-pass');
        const registerPassInput = document.getElementById('register-password');
        if (toggleRegisterPassBtn && registerPassInput) {
            toggleRegisterPassBtn.addEventListener('click', () => {
                const type = registerPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
                registerPassInput.setAttribute('type', type);
                toggleRegisterPassBtn.classList.toggle('fa-eye');
                toggleRegisterPassBtn.classList.toggle('fa-eye-slash');
            });
        }

        // Show/Hide Password - Register (Confirm Password)
        const toggleRegisterConfirmBtn = document.getElementById('toggle-register-confirm-pass');
        const registerConfirmInput = document.getElementById('register-confirm-password');
        if (toggleRegisterConfirmBtn && registerConfirmInput) {
            toggleRegisterConfirmBtn.addEventListener('click', () => {
                const type = registerConfirmInput.getAttribute('type') === 'password' ? 'text' : 'password';
                registerConfirmInput.setAttribute('type', type);
                toggleRegisterConfirmBtn.classList.toggle('fa-eye');
                toggleRegisterConfirmBtn.classList.toggle('fa-eye-slash');
            });
        }

        // Multi-step Registration Navigation
        const nextBtns = document.querySelectorAll('.btn-next');
        const prevBtns = document.querySelectorAll('.btn-prev');
        let currentStep = 1;

        function updateProgress(step) {
            const progressSteps = document.querySelectorAll('.progress-step');
            progressSteps.forEach((ps, index) => {
                const stepNum = index + 1;
                const circle = ps.querySelector('div:first-child');
                const text = ps.querySelector('div:last-child');

                if (stepNum <= step) {
                    // Active or completed
                    circle.style.background = 'var(--primary-color)';
                    circle.style.color = 'white';
                    text.style.color = 'var(--primary-color)';
                } else {
                    // Inactive
                    circle.style.background = '#ddd';
                    circle.style.color = '#888';
                    text.style.color = '#888';
                }
            });
        }

        function showStep(step) {
            const formSteps = document.querySelectorAll('.form-step');
            formSteps.forEach((fs) => {
                fs.style.display = 'none';
                // Remove required from all fields in hidden steps
                const inputs = fs.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.hasAttribute('required')) {
                        input.setAttribute('data-was-required', 'true');
                        input.removeAttribute('required');
                    }
                });
            });

            const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
            if (targetStep) {
                targetStep.style.display = 'block';
                // Re-add required to visible step fields
                const inputs = targetStep.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.getAttribute('data-was-required') === 'true') {
                        input.setAttribute('required', 'required');
                    }
                });
            }
            updateProgress(step);
            currentStep = step;
        }

        function validateStep(step) {
            const errorMsg = document.getElementById('register-error');
            errorMsg.textContent = '';

            if (step === 1) {
                const username = document.getElementById('register-username').value.trim();
                if (!username) {
                    errorMsg.textContent = 'Username wajib diisi!';
                    return false;
                }
                if (username.length < 3) {
                    errorMsg.textContent = 'Username minimal 3 karakter!';
                    return false;
                }
            } else if (step === 2) {
                const email = document.getElementById('register-email').value.trim();
                const whatsapp = document.getElementById('register-whatsapp').value.trim();

                if (!email) {
                    errorMsg.textContent = 'Email wajib diisi!';
                    return false;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    errorMsg.textContent = 'Format email tidak valid!';
                    return false;
                }
                if (!whatsapp) {
                    errorMsg.textContent = 'No. WhatsApp wajib diisi!';
                    return false;
                }
                if (!/^08\d{8,11}$/.test(whatsapp)) {
                    errorMsg.textContent = 'No. WhatsApp harus diawali 08 dan 10-13 digit!';
                    return false;
                }
            }
            return true;
        }

        nextBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    if (currentStep < 3) {
                        showStep(currentStep + 1);
                    }
                }
            });
        });

        prevBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentStep > 1) {
                    showStep(currentStep - 1);
                }
            });
        });

        // Clickable Progress Step Indicators
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach(stepEl => {
            stepEl.addEventListener('click', () => {
                const targetStep = parseInt(stepEl.getAttribute('data-step'));
                // Only allow going back to completed steps or forward with validation
                if (targetStep < currentStep) {
                    showStep(targetStep);
                } else if (targetStep > currentStep) {
                    // Validate all steps up to the target
                    let canProceed = true;
                    for (let i = currentStep; i < targetStep; i++) {
                        if (!validateStep(i)) {
                            canProceed = false;
                            break;
                        }
                    }
                    if (canProceed) {
                        showStep(targetStep);
                    }
                }
            });
        });

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

                    showToast(`Selamat datang, ${data.user.nama_pengguna}!`, 'success');
                    setTimeout(() => {
                        window.location.href = data.user.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                    }, 1000);

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

                    // Auto-login after successful registration
                    showToast('Registrasi Berhasil! Anda akan segera login...', 'success');

                    // Close modal and auto-login
                    const authModal = document.getElementById('auth-modal');
                    if (authModal) authModal.classList.remove('active');

                    // Auto-login the user
                    setTimeout(async () => {
                        try {
                            const loginRes = await fetch('/api/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    email: payload.email,
                                    password: payload.password
                                })
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

    // Jalankan Semua Fungsi
    initializeApp();
    setupEventListeners(); // Panggil ini SETELAH initializeApp agar tombol login/register (jika ada) terdeteksi
    setupFormHandlers();
});