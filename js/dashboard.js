// nobodysandj/ukk/Ukk-7c6003e68c8bfcc1421a6e0fe28a09e9ec6fbf04/js/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }
    if (userData.peran === 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    const welcomeMessage = document.getElementById('welcome-message');
    const orderContainer = document.getElementById('order-history-container');
    const logoutBtn = document.getElementById('dashboard-logout-btn');
    
    const profileForm = document.getElementById('profile-update-form');
    const usernameInput = document.getElementById('profile-username');
    const emailInput = document.getElementById('profile-email');
    const whatsappInput = document.getElementById('profile-whatsapp');
    const instagramInput = document.getElementById('profile-instagram');
    const passwordInput = document.getElementById('profile-password');

    welcomeMessage.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }

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

            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            
            showToast(result.message, true);
            welcomeMessage.textContent = `Selamat Datang, ${result.user.nama_pengguna}!`;
            passwordInput.value = '';

        } catch (error) {
            showToast(error.message, false);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Simpan Perubahan';
        }
    });

    async function fetchOrders() {
        try {
            const response = await fetch('/api/my-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal mengambil data pesanan.');

            const orders = await response.json();
            renderOrders(orders);

        } catch (error) {
            orderContainer.innerHTML = `<p style="text-align: center;">${error.message}</p>`;
        }
    }

    function renderOrders(orders) {
        if (orders.length === 0) {
            orderContainer.innerHTML = '<p style="text-align: center;">Anda belum memiliki riwayat pesanan.</p>';
            return;
        }
        orderContainer.innerHTML = ''; 
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';
            let statusClass = '', statusText = '';
            switch(order.status_tiket) {
                case 'berlaku': statusClass = 'status-berlaku'; statusText = 'Berlaku'; break;
                case 'hangus': statusClass = 'status-hangus'; statusText = 'Sudah Dipakai'; break;
                default: statusClass = 'status-pending'; statusText = 'Pending';
            }
            const orderDate = new Date(order.dibuat_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            let itemsHTML = '<ul>';
            if(order.detail_item) {
                order.detail_item.forEach(item => {
                    itemsHTML += `<li>${item.quantity}x ${item.name}</li>`;
                });
            }
            itemsHTML += '</ul>';
            card.innerHTML = `
                <div class="order-card-header">
                    <div><h3>${order.id_pesanan}</h3><p>Tanggal: ${orderDate}</p></div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="order-card-body">
                    <p>Total: Rp ${order.total_harga.toLocaleString('id-ID')}</p>
                    <p>Item Dibeli:</p>${itemsHTML}
                </div>
                ${order.status_tiket === 'berlaku' ? `<div class="order-card-footer"><canvas id="qr-${order.id_pesanan}"></canvas><p>Tunjukkan QR Code ini di lokasi</p></div>` : '' }
            `;
            orderContainer.appendChild(card);
            if (order.status_tiket === 'berlaku') {
                const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
                if (qrCanvas) {
                    QRCode.toCanvas(qrCanvas, order.id_pesanan, { width: 150, margin: 1 }, function (error) {
                        if (error) console.error(error);
                    });
                }
            }
        });
    }

    fetchProfile();
    fetchOrders();
});