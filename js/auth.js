document.addEventListener('DOMContentLoaded', function () {
    const navLinksContainer = document.getElementById('nav-links');
    if (!navLinksContainer) {
        console.error('Elemen navigasi #nav-links tidak ditemukan!');
        return;
    }

    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    function initializeApp() {
        let navHTML = `
            <li><a href="index.html#about">Tentang Kami</a></li>
            <li><a href="index.html#members">Member</a></li>
            <li><a href="index.html#news">Berita</a></li>
        `;
        navLinksContainer.innerHTML = navHTML;

        let userIconHTML = '';
        if (token && userData) {
            const destination = userData.peran === 'admin' ? 'admin.html' : 'dashboard.html';
            userIconHTML = `<a href="${destination}" title="Akun Saya" class="nav-user-icon"><i class="fas fa-user-circle"></i></a>`;
        } else {
            userIconHTML = `<a href="#" id="auth-icon-btn" title="Login/Daftar" class="nav-user-icon"><i class="fas fa-user-circle"></i></a>`;
        }
        
        const hamburgerMenu = document.getElementById('hamburger-menu');
        if (hamburgerMenu) {
            hamburgerMenu.insertAdjacentHTML('beforebegin', userIconHTML);
        }

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
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');

        closeModalBtn?.addEventListener('click', () => authModal.classList.remove('active'));
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) authModal.classList.remove('active');
        });

        showRegisterLink?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('register-view').style.display = 'block';
        });

        showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-view').style.display = 'none';
            document.getElementById('login-view').style.display = 'block';
        });
    }

    function setupFormHandlers() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        loginForm?.addEventListener('submit', async (e) => {
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
                showToast(`Login berhasil! Selamat datang, ${result.user.nama_pengguna}!`);

                setTimeout(() => {
                    window.location.href = result.user?.peran === 'admin' ? 'admin.html' : 'dashboard.html';
                }, 1500);

            } catch (error) {
                formError.textContent = error.message;
                showToast(error.message, false);
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        });

        registerForm?.addEventListener('submit', async (e) => {
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

                showToast('Pendaftaran berhasil! Silakan login.');
                registerForm.reset();
                document.getElementById('login-view').style.display = 'block';
                document.getElementById('register-view').style.display = 'none';

            } catch (error) {
                formError.textContent = error.message;
                showToast(error.message, false);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Daftar';
            }
        });
    }
    
    // Menambahkan style untuk ikon pengguna secara dinamis
    const style = document.createElement('style');
    style.innerHTML = `
        .nav-user-icon {
            color: var(--light-text-color);
            font-size: 1.8rem;
            cursor: pointer;
            display: block;
            margin-left: 1rem;
        }
    `;
    document.head.appendChild(style);

    initializeApp();
    setupModalListeners();
    setupFormHandlers();
});