// js/auth.js

document.addEventListener('DOMContentLoaded', function() {
    const navLinksContainer = document.getElementById('nav-links');
    
    // Simpan token di variabel (atau bisa juga langsung dari localStorage)
    const token = localStorage.getItem('userToken');

    // --- FUNGSI UNTUK MENGATUR TAMPILAN NAVIGASI ---
    function setupNavigation() {
        let navHTML = `
            <li><a href="index.html#about">Tentang Kami</a></li>
            <li><a href="index.html#members">Member</a></li>
            <li><a href="index.html#news">Berita</a></li>
            <li><a href="gallery.html">Galeri</a></li>
            <li><a href="cheki.html">Pesan Cheki</a></li>
        `;

        if (token) {
            // Jika pengguna sudah login
            navHTML += `
                <li><a href="dashboard.html">Akun Saya</a></li>
                <li><a href="#" id="logout-btn">Logout</a></li>
            `;
        } else {
            // Jika pengguna belum login
            navHTML += `
                <li><a href="login.html">Login</a></li>
                <li><a href="register.html" class="nav-register-btn">Daftar</a></li>
            `;
        }
        navLinksContainer.innerHTML = navHTML;

        // Tambahkan event listener untuk logout jika tombolnya ada
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData'); // Hapus juga data user
                window.location.href = 'index.html';
            });
        }
    }

    // --- LOGIKA HALAMAN REGISTER ---
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formError = document.getElementById('form-error');
            const submitButton = registerForm.querySelector('button');

            const userData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                whatsapp_number: document.getElementById('whatsapp').value,
                instagram_username: document.getElementById('instagram').value,
            };

            submitButton.disabled = true;
            submitButton.textContent = 'Mendaftar...';
            formError.textContent = '';

            try {
                const response = await fetch('/api/register', { // Endpoint di backend
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message || 'Gagal mendaftar.');
                }
                
                alert('Pendaftaran berhasil! Silakan login.');
                window.location.href = 'login.html';

            } catch (error) {
                formError.textContent = error.message;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Daftar';
            }
        });
    }

    // --- LOGIKA HALAMAN LOGIN ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formError = document.getElementById('form-error');
            const submitButton = loginForm.querySelector('button');

            const loginData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            submitButton.disabled = true;
            submitButton.textContent = 'Masuk...';
            formError.textContent = '';
            
            try {
                const response = await fetch('/api/login', { // Endpoint di backend
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Login gagal.');
                }

                // Simpan token dan data user ke localStorage
                localStorage.setItem('userToken', result.token);
                localStorage.setItem('userData', JSON.stringify(result.user));
                
                window.location.href = 'dashboard.html'; // Alihkan ke dasbor

            } catch (error) {
                formError.textContent = error.message;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        });
    }

    // Panggil fungsi untuk setup navigasi di setiap halaman
    setupNavigation();
});