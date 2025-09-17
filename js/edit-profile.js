document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    const profileForm = document.getElementById('profile-update-form');
    const usernameInput = document.getElementById('profile-username');
    const emailInput = document.getElementById('profile-email');
    const whatsappInput = document.getElementById('profile-whatsapp');
    const instagramInput = document.getElementById('profile-instagram');
    const passwordInput = document.getElementById('profile-password');

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

        } catch (error) {
            showToast(error.message, false);
        }
    }

    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitButton = this.querySelector('button');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        const updatedData = {
            nama_pengguna: usernameInput.value,
            email: emailInput.value,
            nomor_whatsapp: whatsappInput.value,
            instagram: instagramInput.value,
            password: passwordInput.value,
        };
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

            // Perbarui token dan data pengguna di localStorage
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            
            showToast(result.message, true);
            passwordInput.value = '';

        } catch (error) {
            showToast(error.message, false);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Simpan Perubahan';
        }
    });

    fetchProfile();
});