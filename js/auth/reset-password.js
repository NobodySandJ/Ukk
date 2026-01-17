// Logic buat halaman reset password
// User masukin kode OTP + Password baru disini
if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || '../../';
}
var basePath = window.basePath;

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reset-password-form');
    const otpInput = document.getElementById('otp-code');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitBtn = document.getElementById('submit-btn');
    const messageBox = document.getElementById('message-box');
    const resetBtn = document.getElementById('reset-btn');

    if (!form) return;

    // Fitur buat intip password (toggle lihat/sembunyi)
    const togglePassword = (toggleId, inputId) => {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        if (toggle && input) {
            toggle.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                toggle.classList.toggle('fa-eye');
                toggle.classList.toggle('fa-eye-slash');
            });
        }
    };

    // Auto-format OTP input (Hanya Alphanumeric & Uppercase)
    otpInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    });

    // Handle form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const code = otpInput.value.trim();
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validasi
        messageBox.textContent = '';
        messageBox.className = 'message-box';

        if (code.length !== 6) {
            showMessage('Kode OTP harus 6 digit.', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('Password minimal 6 karakter.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('Password dan konfirmasi tidak cocok.', 'error');
            return;
        }

        // Disable button saat proses
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

        try {
            const response = await fetch('/api/reset-password-with-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    newPassword: newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(result.message, 'success');

                // Reset form
                form.reset();

                // Redirect ke login setelah 3 detik
                setTimeout(() => {
                    showToast('Mengarahkan ke halaman login...', 'info');
                    setTimeout(() => {
                        window.location.href = `${basePath}index.html`;
                    }, 1500);
                }, 2000);

            } else {
                showMessage(result.message || 'Gagal mereset password.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Password Baru';
            }

        } catch (error) {
            console.error('Error:', error);
            showMessage('Terjadi kesalahan. Silakan coba lagi.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Password Baru';
        }
    });

    function showMessage(msg, type) {
        messageBox.textContent = msg;
        messageBox.className = `message-box ${type}`;
    }
});