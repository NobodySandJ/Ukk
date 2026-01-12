// File: js/dashboard.js

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

    // --- LOGIKA NOTIFIKASI PEMBAYARAN SUKSES (BARU) ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
        alert('Pembayaran Berhasil! Tiket Anda sudah tersedia di bawah.');
        // Membersihkan URL agar notifikasi tidak muncul lagi saat refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    // --------------------------------------------------

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
        console.log('Orders received:', orders);
        
        if (orders.length === 0) {
            ticketContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <p style="margin-bottom: 1.5rem; color: #6c757d;">Anda belum memiliki tiket saat ini.</p>
                    <a href="cheki.html" class="cta-button">
                        <i class="fas fa-ticket-alt"></i> Beli Tiket Cheki Sekarang
                    </a>
                </div>
            `;
            return;
        }

        // Sort: berlaku first, then others
        orders.sort((a, b) => (a.status_tiket === 'berlaku' && b.status_tiket !== 'berlaku') ? -1 : 1);

        ticketContainer.innerHTML = ''; 
        orders.forEach(order => {
            // Skip pending orders
            if (order.status_tiket === 'pending') return;

            const card = document.createElement('div');
            const isUsed = order.status_tiket !== 'berlaku';
            card.className = `ticket-card ${isUsed ? 'ticket-used' : ''}`;
            
            const itemsList = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join('<br>') || 'Tidak ada detail item.';

            // Determine status badge
            let statusBadge = '';
            let statusText = '';
            if (order.status_tiket === 'berlaku') {
                statusBadge = '<span style="background:#28a745;color:white;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">✓ BERLAKU</span>';
                statusText = 'Masih Berlaku';
            } else if (order.status_tiket === 'hangus' || order.status_tiket === 'sudah_dipakai') {
                statusBadge = '<span style="background:#6c757d;color:white;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">✗ SUDAH TERPAKAI</span>';
                statusText = 'Sudah Terpakai';
            } else {
                statusBadge = `<span style="background:#ffc107;color:#000;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">${order.status_tiket.toUpperCase()}</span>`;
                statusText = order.status_tiket;
            }

            const qrSectionHTML = order.status_tiket === 'berlaku'
                ? `<div class="ticket-qr"><canvas id="qr-${order.id_pesanan}"></canvas></div>`
                : `<div class="ticket-qr-used"><span>SUDAH<br>TERPAKAI</span></div>`;

            card.innerHTML = `
                <div class="ticket-details">
                    <p><strong>ID Pesanan</strong>: ${order.id_pesanan}</p>
                    <p><strong>Total</strong>: Rp ${order.total_harga.toLocaleString('id-ID')}</p>
                    <p><strong>Status</strong>: ${statusBadge}</p>
                    <p><strong>Item Dibeli</strong>: <br><span class="item-list">${itemsList}</span></p>
                </div>
                ${qrSectionHTML}
            `;
            
            ticketContainer.appendChild(card);
            
            // Generate QR code for valid tickets
            if (order.status_tiket === 'berlaku') {
                const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
                if (qrCanvas) {
                    const qrItems = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'N/A';
                    const qrData = `ID Pesanan: ${order.id_pesanan}\nPelanggan: ${userData.nama_pengguna}\nItem: ${qrItems}`;
                    
                    // Pastikan library QRCode sudah diload di dashboard.html
                    if (typeof QRCode !== 'undefined') {
                        QRCode.toCanvas(qrCanvas, qrData, { width: 120, margin: 1 }, (error) => {
                            if (error) console.error('QR Code Error:', error);
                        });
                    }
                }
            }
        });
    }

    fetchOrders();
});