document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    // Cek otentikasi
    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }
    // Arahkan admin ke halaman admin
    if (userData.peran === 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    const usernameDisplay = document.getElementById('username-display');
    const ticketContainer = document.getElementById('ticket-container');
    const logoutBtn = document.getElementById('logout-btn');

    // Tampilkan username
    usernameDisplay.textContent = userData.nama_pengguna.toUpperCase();

    // Fungsi Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }

    async function fetchOrders() {
        try {
            const response = await fetch('/api/my-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal mengambil data pesanan.');

            const orders = await response.json();
            renderTickets(orders);

        } catch (error) {
            ticketContainer.innerHTML = `<p>${error.message}</p>`;
        }
    }

    function renderTickets(orders) {
        // Filter hanya tiket yang berlaku
        const validTickets = orders.filter(order => order.status_tiket === 'berlaku');

        if (validTickets.length === 0) {
            ticketContainer.innerHTML = '<p>Anda tidak memiliki tiket yang aktif.</p>';
            return;
        }

        ticketContainer.innerHTML = ''; 
        validTickets.forEach(order => {
            const card = document.createElement('div');
            card.className = 'ticket-card';
            
            // Membuat daftar item dari detail_item
            let itemsList = 'Tidak ada detail item';
            if (order.detail_item && order.detail_item.length > 0) {
                itemsList = order.detail_item.map(item => `${item.quantity}x ${item.name}`).join('<br>');
            }

            card.innerHTML = `
                <div class="ticket-details">
                    <p><strong>ID Pesanan</strong>: ${order.id_pesanan}</p>
                    <p><strong>Total</strong>: Rp ${order.total_harga.toLocaleString('id-ID')}</p>
                    <p><strong>Item Dibeli</strong>: <br><span class="item-list">${itemsList}</span></p>
                </div>
                <div class="ticket-qr">
                    <canvas id="qr-${order.id_pesanan}"></canvas>
                </div>
            `;
            
            ticketContainer.appendChild(card);
            
            // Generate QR Code dengan data yang lebih lengkap
            const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
            if (qrCanvas) {
                // Membuat string data untuk QR code
                const qrItems = order.detail_item ? order.detail_item.map(item => `${item.quantity}x ${item.name}`).join(', ') : 'N/A';
                const qrData = `ID Pesanan: ${order.id_pesanan}\nItem: ${qrItems}`;
                
                QRCode.toCanvas(qrCanvas, qrData, { width: 100, margin: 1 }, function (error) {
                    if (error) console.error(error);
                    console.log(`QR Code untuk ${order.id_pesanan} berhasil dibuat.`);
                });
            }
        });
    }

    fetchOrders();
});