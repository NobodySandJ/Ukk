// js/dashboard.js (Perbaikan Final)

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    const welcomeMessage = document.getElementById('welcome-message');
    const orderContainer = document.getElementById('order-history-container');

    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }

    // FIX 1: Menggunakan 'nama_pengguna' sesuai dengan data dari database
    welcomeMessage.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;

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
            
            // Mengubah status_tiket menjadi lebih user-friendly
            let statusClass = '';
            let statusText = '';
            switch(order.status_tiket) {
                case 'berlaku':
                    statusClass = 'status-berlaku';
                    statusText = 'Masih Berlaku';
                    break;
                case 'hangus':
                    statusClass = 'status-hangus';
                    statusText = 'Sudah Dipakai / Hangus';
                    break;
                default:
                    statusClass = 'status-pending'; // Anda bisa menambahkan style untuk ini di CSS
                    statusText = 'Menunggu Pembayaran';
            }
            
            // FIX 2: Menggunakan 'dibuat_pada' sesuai dengan nama kolom di database
            const orderDate = new Date(order.dibuat_pada).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            let itemsHTML = '<ul>';
            if(order.detail_item) {
                order.detail_item.forEach(item => {
                    itemsHTML += `<li>${item.quantity}x ${item.name}</li>`;
                });
            }
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
                    ${order.status_tiket === 'berlaku' ? 
                        `<p>Tunjukkan QR ini di lokasi</p>
                         <canvas id="qr-${order.id_pesanan}"></canvas>` :
                        '<p style="opacity: 0.6;">QR Code tidak tersedia untuk tiket ini.</p>'
                    }
                </div>
            `;
            orderContainer.appendChild(card);
            
            // Hanya generate QR Code jika tiketnya berlaku
            if (order.status_tiket === 'berlaku') {
                const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
                QRCode.toCanvas(qrCanvas, order.id_pesanan, { width: 150 }, function (error) {
                    if (error) console.error(error);
                });
            }
        });
    }

    fetchOrders();
});