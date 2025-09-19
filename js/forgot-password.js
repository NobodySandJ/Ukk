document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email-input');
    const messageBox = document.getElementById('message-box');
    const submitButton = form.querySelector('button');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Mengirim...';
        messageBox.textContent = '';
        messageBox.style.color = '';

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Terjadi kesalahan.');
            }

            messageBox.style.color = 'var(--success-color)';
            messageBox.textContent = result.message;
            form.reset();
            
        } catch (error) {
            messageBox.style.color = '#D33333';
            messageBox.textContent = error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Kirim Link Reset';
        }
    });
});