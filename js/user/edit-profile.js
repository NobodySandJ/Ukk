// Konfigurasi dasar buat path file
if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || '../../';
}
var basePath = window.basePath;

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('userToken');

    // Kalo belum login, jangan kasih masuk sini
    if (!token) {
        window.location.href = `${basePath}index.html`;
        return;
    }

    // ==========================================
    // AREA INI BUAT AMBIL DATA DARI FORM HTML
    // ==========================================
    const profileForm = document.getElementById('profile-update-form');
    const usernameInput = document.getElementById('profile-username');
    const emailInput = document.getElementById('profile-email');
    const whatsappInput = document.getElementById('profile-whatsapp');
    const instagramInput = document.getElementById('profile-instagram');
    const oshiSelect = document.getElementById('profile-oshi');
    const passwordInput = document.getElementById('profile-password');

    // Fungsi buat nampilin pesan error di bawah input
    function showError(input, message) {
        input.classList.add('error');
        input.classList.remove('success');
        let errorEl = input.parentElement.querySelector('.form-error-message');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'form-error-message';
            input.parentElement.appendChild(errorEl);
        }
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }

    function showSuccess(input) {
        input.classList.remove('error');
        input.classList.add('success');
        const errorEl = input.parentElement.querySelector('.form-error-message');
        if (errorEl) {
            errorEl.classList.remove('show');
            errorEl.textContent = '';
        }
    }

    function clearValidation(input) {
        input.classList.remove('error', 'success');
        const errorEl = input.parentElement.querySelector('.form-error-message');
        if (errorEl) {
            errorEl.classList.remove('show');
        }
    }

    // Cek inputan user tiap kali mereka selesai ngetik (blur event)
    // Biar langsung ketahuan kalo ada yang salah
    usernameInput?.addEventListener('blur', () => {
        const value = usernameInput.value.trim();
        if (!value) {
            showError(usernameInput, 'Username wajib diisi');
        } else if (value.length < 3) {
            showError(usernameInput, 'Username minimal 3 karakter');
        } else {
            showSuccess(usernameInput);
        }
    });

    emailInput?.addEventListener('blur', () => {
        const value = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
            showError(emailInput, 'Email wajib diisi');
        } else if (!emailRegex.test(value)) {
            showError(emailInput, 'Format email tidak valid');
        } else {
            showSuccess(emailInput);
        }
    });

    whatsappInput?.addEventListener('blur', () => {
        const value = whatsappInput.value.trim();
        if (value && !/^08\d{8,11}$/.test(value)) {
            showError(whatsappInput, 'Format: 08xxx (10-13 digit)');
        } else if (value) {
            showSuccess(whatsappInput);
        } else {
            clearValidation(whatsappInput);
        }
    });

    passwordInput?.addEventListener('blur', () => {
        const value = passwordInput.value;
        if (value && value.length < 6) {
            showError(passwordInput, 'Password minimal 6 karakter');
        } else if (value) {
            showSuccess(passwordInput);
        } else {
            clearValidation(passwordInput);
        }
    });

    // Clear validasi saat focus
    [usernameInput, emailInput, whatsappInput, instagramInput, passwordInput].forEach(input => {
        input?.addEventListener('focus', () => {
            clearValidation(input);
        });
    });

    // ============================================================
    // FETCH DATA PROFIL DARI SERVER
    // ============================================================
    async function fetchProfile() {
        try {
            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal mengambil data profil.');

            const profile = await response.json();
            usernameInput.value = profile.nama_pengguna;
            emailInput.value = profile.email;
            whatsappInput.value = profile.nomor_whatsapp || '';
            instagramInput.value = profile.instagram || '';
            if (oshiSelect) oshiSelect.value = profile.oshi || '';

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // ============================================================
    // HANDLER SUBMIT FORM UPDATE PROFIL
    // ============================================================
    profileForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validasi sebelum submit
        let hasError = false;

        const username = usernameInput.value.trim();
        if (!username) {
            showError(usernameInput, 'Username wajib diisi');
            hasError = true;
        } else if (username.length < 3) {
            showError(usernameInput, 'Username minimal 3 karakter');
            hasError = true;
        }

        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            showError(emailInput, 'Email wajib diisi');
            hasError = true;
        } else if (!emailRegex.test(email)) {
            showError(emailInput, 'Format email tidak valid');
            hasError = true;
        }

        const whatsapp = whatsappInput.value.trim();
        if (whatsapp && !/^08\d{8,11}$/.test(whatsapp)) {
            showError(whatsappInput, 'Format: 08xxx (10-13 digit)');
            hasError = true;
        }

        const password = passwordInput.value;
        if (password && password.length < 6) {
            showError(passwordInput, 'Password minimal 6 karakter');
            hasError = true;
        }

        if (hasError) {
            showToast('Mohon periksa kembali data Anda', 'error');
            return;
        }

        const submitButton = this.querySelector('button');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        // Data yang akan dikirim ke server
        const updatedData = {
            nama_pengguna: username,
            email: email,
            nomor_whatsapp: whatsapp,
            instagram: instagramInput.value,
            oshi: oshiSelect ? oshiSelect.value : undefined,
            password: password,
        };

        // Hapus password dari payload jika kosong
        if (!updatedData.password) {
            delete updatedData.password;
        }

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            // Update token & data user di localStorage
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));

            showToast(result.message, 'success');
            passwordInput.value = '';
            clearValidation(passwordInput);

        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Simpan Perubahan';
        }
    });

    fetchProfile();
});