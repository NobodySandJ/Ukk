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

    const usernameDisplay = document.getElementById('username-display');
    const ticketContainer = document.getElementById('ticket-container');
    const logoutBtn = document.getElementById('logout-btn');

    if (usernameDisplay) {
        usernameDisplay.textContent = userData.nama_pengguna.toUpperCase();
    }

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

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
        if (orders.length === 0) {
            ticketContainer.innerHTML = '<p>Anda belum memiliki tiket.</p>';
            return;
        }

        orders.sort((a, b) => (a.status_tiket === 'berlaku' && b.status_tiket !== 'berlaku') ? -1 : 1);

        ticketContainer.innerHTML = ''; 
        orders.forEach(order => {
            if (order.status_tiket === 'pending') return;

            const card = document.createElement('div');
            card.className = `ticket-card ${order.status_tiket === 'hangus' ? 'ticket-expired' : ''}`;
            
            const itemsList = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join('<br>') || 'Tidak ada detail item.';

            const qrSectionHTML = order.status_tiket === 'berlaku'
                ? `<div class="ticket-qr"><canvas id="qr-${order.id_pesanan}"></canvas></div>`
                : `<div class="ticket-qr-expired"><span>EXPIRED</span></div>`;

            card.innerHTML = `
                <div class="ticket-details">
                    <p><strong>ID Pesanan</strong>: ${order.id_pesanan}</p>
                    <p><strong>Total</strong>: Rp ${order.total_harga.toLocaleString('id-ID')}</p>
                    <p><strong>Item Dibeli</strong>: <br><span class="item-list">${itemsList}</span></p>
                </div>
                ${qrSectionHTML}
            `;
            
            ticketContainer.appendChild(card);
            
            if (order.status_tiket === 'berlaku') {
                const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
                if (qrCanvas) {
                    const qrItems = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'N/A';
                    const qrData = `ID Pesanan: ${order.id_pesanan}\nPelanggan: ${userData.nama_pengguna}\nItem: ${qrItems}`;
                    
                    QRCode.toCanvas(qrCanvas, qrData, { width: 120, margin: 1 }, (error) => {
                        if (error) console.error(error);
                    });
                }
            }
        });
    }

    fetchOrders();
});