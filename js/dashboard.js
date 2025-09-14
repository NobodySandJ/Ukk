// js/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    const welcomeMessage = document.getElementById('welcome-message');
    const orderContainer = document.getElementById('order-history-container');
    const logoutBtn = document.getElementById('dashboard-logout-btn');

    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }

    welcomeMessage.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }

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
                <div class="order-card-header">
                    <div>
                        <h3>${order.id_pesanan}</h3>
                        <p>Tanggal: ${orderDate}</p>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="order-card-body">
                    <p>Total: Rp ${order.total_harga.toLocaleString('id-ID')}</p>
                    <p>Item Dibeli:</p>
                    ${itemsHTML}
                </div>
                ${order.status_tiket === 'berlaku' ? 
                    `<div class="order-card-footer">
                         <canvas id="qr-${order.id_pesanan}"></canvas>
                         <p>Tunjukkan QR Code ini di lokasi</p>
                     </div>` :
                    ''
                }
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

    fetchOrders();
});