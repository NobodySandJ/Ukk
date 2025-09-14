// js/auth.js (Penyempurnaan Terakhir)

document.addEventListener('DOMContentLoaded', function() {
    const navLinksContainer = document.getElementById('nav-links');
    if (!navLinksContainer) {
        console.error('Elemen navigasi #nav-links tidak ditemukan!');
        return;
    }

    const token = localStorage.getItem('userToken');

    function initializeApp() {
        let navHTML = `
            <li><a href="index.html#about">Tentang Kami</a></li>
            <li><a href="index.html#members">Member</a></li>
            <li><a href="index.html#news">Berita</a></li>
        `;

        if (token) {
            navHTML += `
                <li><a href="dashboard.html" title="Akun Saya"><i class="fas fa-user-circle" style="font-size: 1.5rem;"></i></a></li>
            `;
        } else {
            navHTML += `
                <li><a href="#" id="auth-icon-btn" title="Login/Daftar"><i class="fas fa-user-circle" style="font-size: 1.5rem;"></i></a></li>
            `;
        }
        
        navLinksContainer.innerHTML = navHTML;

        const authIconBtn = document.getElementById('auth-icon-btn');
        const authModal = document.getElementById('auth-modal');

        if (authIconBtn && authModal) {
            authIconBtn.addEventListener('click', (e) => {
                e.preventDefault();
                authModal.classList.add('active');
            });
        }
    }

    function setupModalListeners() {
        const authModal = document.getElementById('auth-modal');
        if (!authModal) return;

        const closeModalBtn = document.getElementById('modal-close-btn');
        const loginView = document.getElementById('login-view');
        const registerView = document.getElementById('register-view');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
        }
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('active');
            }
        });

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
                    
                    // **FIX:** Membersihkan data lama sebelum menyimpan yang baru
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userData');
                    
                    localStorage.setItem('userToken', result.token);
                    localStorage.setItem('userData', JSON.stringify(result.user));

                    if (result.user.peran === 'admin') {
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

    initializeApp();
    setupModalListeners();
    setupFormHandlers();
});