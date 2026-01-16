// ================================================================
// FILE: forgot-password.js - Self-Service Password Reset
// Verifikasi identitas user dengan No WA + Email, tampilkan OTP
// ================================================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgot-password-form');
    const verifyBtn = document.getElementById('verify-btn');
    const messageBox = document.getElementById('message-box');
    const otpModal = document.getElementById('otp-modal');
    const otpCodeDisplay = document.getElementById('otp-code-display');
    const otpExpiry = document.getElementById('otp-expiry');
    const copyBtn = document.getElementById('copy-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');

    if (!form) return;

    // Handle form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const whatsapp = document.getElementById('whatsapp').value.trim();
        const email = document.getElementById('email').value.trim();

        // Clear previous messages
        messageBox.textContent = '';
        messageBox.className = 'message-box';

        // Validasi input
        if (!whatsapp || !email) {
            showMessage('Harap isi semua field.', 'error');
            return;
        }

        // Normalize nomor WA: convert 08xxx ke 62xxx
        let normalizedWA = whatsapp;
        if (whatsapp.startsWith('08')) {
            normalizedWA = '62' + whatsapp.substring(1);
        }

        // Validasi format nomor WA (harus diawali 62 atau 08)
        if (!normalizedWA.startsWith('62')) {
            showMessage('Format nomor tidak valid. Gunakan 08xxx atau 62xxx', 'error');
            return;
        }

        if (normalizedWA.length < 10 || normalizedWA.length > 15) {
            showMessage('Nomor WhatsApp tidak valid (10-15 digit).', 'error');
            return;
        }

        // Disable button saat proses
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memverifikasi...';

        try {
            const response = await fetch('/api/verify-and-generate-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ whatsapp: normalizedWA, email })
            });

            const result = await response.json();

            if (response.ok) {
                // Sukses - tampilkan modal OTP
                showOtpModal(result.code, result.expiresIn);
                form.reset();
            } else {
                showMessage(result.message || 'Verifikasi gagal.', 'error');
            }

        } catch (error) {
            console.error('Error:', error);
            showMessage('Terjadi kesalahan. Pastikan server berjalan.', 'error');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-search"></i> Verifikasi Data';
        }
    });

    // Tampilkan OTP Modal
    function showOtpModal(code, expiresIn) {
        otpCodeDisplay.textContent = code;
        otpExpiry.textContent = `Berlaku ${expiresIn}`;
        otpModal.classList.add('active');

        // Reset copy button
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin Kode OTP';
        copyBtn.classList.remove('copied');
    }

    // Tutup modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            otpModal.classList.remove('active');
        });
    }

    // Klik di luar modal untuk tutup
    if (otpModal) {
        otpModal.addEventListener('click', (e) => {
            if (e.target === otpModal) {
                otpModal.classList.remove('active');
            }
        });
    }

    // Copy OTP ke clipboard
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const code = otpCodeDisplay.textContent;

            try {
                await navigator.clipboard.writeText(code);
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
                copyBtn.classList.add('copied');

                // Toast notification jika tersedia
                if (typeof showToast === 'function') {
                    showToast('Kode OTP berhasil disalin!', 'success');
                }

                // Reset setelah 2 detik
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin Kode OTP';
                    copyBtn.classList.remove('copied');
                }, 2000);

            } catch (err) {
                console.error('Gagal menyalin:', err);
                // Fallback untuk browser lama
                const textArea = document.createElement('textarea');
                textArea.value = code;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                copyBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
                copyBtn.classList.add('copied');
            }
        });
    }

    // Helper function untuk menampilkan pesan
    function showMessage(msg, type) {
        messageBox.textContent = msg;
        messageBox.className = `message-box ${type}`;
    }
});