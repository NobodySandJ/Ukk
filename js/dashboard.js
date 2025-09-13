document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    const welcomeMessage = document.getElementById('welcome-message');
    const orderContainer = document.getElementById('order-history-container');

    if (!token || !userData) {
        // Jika tidak login, paksa kembali ke halaman utama
        window.location.href = 'index.html';
        return;
    }

    welcomeMessage.textContent = `Selamat Datang, ${userData.username}!`;

    async function fetchOrders() {
        try {
            const response = await fetch('/api/my-orders', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data pesanan.');
            }

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

        orderContainer.innerHTML = ''; // Kosongkan kontainer

        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';

            const statusClass = order.status_tiket === 'berlaku' ? 'status-berlaku' : 'status-hangus';
            const statusText = order.status_tiket === 'berlaku' ? 'Masih Berlaku' : 'Sudah Dipakai / Hangus';
            
            // Format tanggal menjadi lebih mudah dibaca
            const orderDate = new Date(order.created_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            let itemsHTML = '<ul>';
            order.detail_item.forEach(item => {
                itemsHTML += `<li>${item.quantity}x ${item.name}</li>`;
            });
            itemsHTML += '</ul>';

            card.innerHTML = `
                <div class="order-details">
                    <h3>ID Pesanan: ${order.id_pesanan}</h3>
                    <p><strong>Tanggal:</strong> ${orderDate}</p>
                    <p><strong>Total:</strong> Rp ${order.total_harga.toLocaleString('id-ID')}</p>
                    <p><strong>Status Tiket:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
                    <p><strong>Item:</strong></p>
                    ${itemsHTML}
                </div>
                <div class="order-qr">
                    <p>Tunjukkan QR ini di lokasi</p>
                    <canvas id="qr-${order.id_pesanan}"></canvas>
                </div>
            `;
            orderContainer.appendChild(card);

            // Generate QR Code untuk setiap kartu
            const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
            QRCode.toCanvas(qrCanvas, order.id_pesanan, { width: 150 }, function (error) {
                if (error) console.error(error);
            });
        });
    }

    fetchOrders();
});