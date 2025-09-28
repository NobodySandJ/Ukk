document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reset-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const messageBox = document.getElementById('message-box');
    const submitButton = form.querySelector('button');

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        messageBox.style.color = '#D33333';
        messageBox.textContent = 'Token reset tidak ditemukan. Silakan coba lagi dari awal.';
        submitButton.disabled = true;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (newPasswordInput.value !== confirmPasswordInput.value) {
            messageBox.style.color = '#D33333';
            messageBox.textContent = 'Konfirmasi sandi tidak cocok.';
            return;
        }
        if (newPasswordInput.value.length < 6) {
            messageBox.style.color = '#D33333';
            messageBox.textContent = 'Sandi minimal harus 6 karakter.';
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';
        messageBox.textContent = '';

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, newPassword: newPasswordInput.value })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            messageBox.style.color = 'var(--success-color)';
            messageBox.textContent = result.message + ' Anda akan dialihkan...';
            
            setTimeout(() => {
                window.location.href = '/index.html'; 
            }, 3000);

        } catch (error) {
            messageBox.style.color = '#D33333';
            messageBox.textContent = error.message;
            submitButton.disabled = false;
            submitButton.textContent = 'Simpan Sandi Baru';
        }
    });
});