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
    if (usernameDisplay) {
        usernameDisplay.textContent = userData.nama_pengguna.toUpperCase();
    }

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
        // Hapus filter, sekarang kita akan menampilkan semua tiket
        if (orders.length === 0) {
            ticketContainer.innerHTML = '<p>Anda belum memiliki tiket.</p>';
            return;
        }

        // Urutkan tiket: yang 'berlaku' duluan, baru 'hangus'
        orders.sort((a, b) => {
            if (a.status_tiket === 'berlaku' && b.status_tiket !== 'berlaku') return -1;
            if (a.status_tiket !== 'berlaku' && b.status_tiket === 'berlaku') return 1;
            return 0;
        });

        ticketContainer.innerHTML = ''; 
        orders.forEach(order => {
            // Lewati tiket pending, hanya tampilkan yang berlaku atau hangus
            if (order.status_tiket === 'pending') {
                return;
            }

            const card = document.createElement('div');
            card.className = 'ticket-card';
            
            // Tambahkan class khusus jika tiket sudah hangus
            if (order.status_tiket === 'hangus') {
                card.classList.add('ticket-expired');
            }
            
            let itemsList = 'Tidak ada detail item.';
            if (order.detail_item && order.detail_item.length > 0) {
                itemsList = order.detail_item.map(item => `${item.quantity}x ${item.name}`).join('<br>');
            }

            // Tentukan apa yang akan ditampilkan di area QR code
            let qrSectionHTML = '';
            if (order.status_tiket === 'berlaku') {
                qrSectionHTML = `
                    <div class="ticket-qr">
                        <canvas id="qr-${order.id_pesanan}"></canvas>
                    </div>
                `;
            } else { // Jika hangus
                qrSectionHTML = `
                    <div class="ticket-qr-expired">
                        <span>EXPIRED</span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="ticket-details">
                    <p><strong>ID Pesanan</strong>: ${order.id_pesanan}</p>
                    <p><strong>Total</strong>: Rp ${order.total_harga.toLocaleString('id-ID')}</p>
                    <p><strong>Item Dibeli</strong>: <br><span class="item-list">${itemsList}</span></p>
                </div>
                ${qrSectionHTML}
            `;
            
            ticketContainer.appendChild(card);
            
            // Generate QR Code hanya untuk tiket yang masih berlaku
            if (order.status_tiket === 'berlaku') {
                const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
                if (qrCanvas) {
                    const qrItems = order.detail_item ? order.detail_item.map(item => `${item.quantity}x ${item.name}`).join(', ') : 'N/A';
                    const qrData = `ID Pesanan: ${order.id_pesanan}\nPelanggan: ${userData.nama_pengguna}\nItem: ${qrItems}`;
                    
                    QRCode.toCanvas(qrCanvas, qrData, { width: 120, margin: 1 }, function (error) {
                        if (error) console.error(error);
                    });
                }
            }
        });
    }

    fetchOrders();
});