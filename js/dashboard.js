// File: js/dashboard.js
// VERSI FINAL: Dengan fitur Oshi, Badge, Notifikasi Bayar, & Leaderboard Preview

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    // 1. Cek Login
    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }
    if (userData.peran === 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    // 2. Logika Notifikasi Pembayaran Sukses (Dari Redirect)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
        showToast('Pembayaran Berhasil! Tiket Anda sudah tersedia di bawah.', 'success');
        // Membersihkan URL agar notifikasi tidak muncul lagi saat refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // --- SETUP TAMPILAN PROFIL (OSHI & BADGES) ---
    const usernameDisplay = document.getElementById('username-display');
    const oshiDisplay = document.getElementById('oshi-display');
    const profileImg = document.getElementById('profile-oshi-img');
    const userBadges = document.getElementById('user-badges');
    const leaderboardTitle = document.getElementById('leaderboard-title');

    if (usernameDisplay) {
        usernameDisplay.textContent = userData.nama_pengguna.toUpperCase();
    }

    // Display Oshi Name
    if (oshiDisplay && userData.oshi) {
        oshiDisplay.innerHTML = `❤️ Oshi: ${userData.oshi}`;
    }

    // Update Leaderboard Title
    if (leaderboardTitle && userData.oshi) {
        leaderboardTitle.innerHTML = `<i class="fas fa-trophy"></i> TOP SPENDER ${userData.oshi.toUpperCase()}`;
    }

    // Fungsi mendapatkan gambar Oshi
    function getOshiImage(oshiName) {
        // Pastikan Anda memiliki gambar-gambar ini di folder img/member/
        // Format nama file harus lowercase (misal: aca.webp, cally.webp, sinta.webp, piya.webp, dll)
        if (!oshiName || oshiName === 'All Member') return 'img/logo/apple-touch-icon.png';
        return `img/member/${oshiName.toLowerCase()}.webp`;
    }

    // Update Foto Profil & Badge
    if (profileImg && userData.oshi) {
        profileImg.src = getOshiImage(userData.oshi);

        // Tampilkan Badge jika user punya Oshi spesifik
        if (userData.oshi !== 'All Member') {
            if (userBadges) {
                userBadges.innerHTML = ''; // Reset
                const badge = document.createElement('span');
                badge.className = 'badge';
                // Styling inline untuk badge
                badge.style.cssText = "background: #ffebee; color: #c62828; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
                badge.innerHTML = `<i class="fas fa-heart"></i> Team ${userData.oshi}`;
                userBadges.appendChild(badge);
            }
        }
    }

    // --- FETCH DASHBOARD LEADERBOARD (PREVIEW TOP 3) ---
    async function fetchDashboardLeaderboard() {
        const loadingDiv = document.getElementById('dashboard-leaderboard-loading');
        const container = document.getElementById('top-spenders-container');

        if (!container || !loadingDiv) return;

        try {
            const response = await fetch('/api/leaderboard');
            const data = await response.json();

            if (!data || data.length === 0) {
                loadingDiv.textContent = "Belum ada sultan saat ini.";
                return;
            }

            loadingDiv.style.display = 'none';
            container.style.display = 'flex';

            // Ambil hanya Top 3 untuk preview di dashboard
            const top3 = data.slice(0, 3);

            const rankEmojis = ['🥇', '🥈', '🥉'];

            container.innerHTML = top3.map((user, index) => `
                <div class="top-spender-card rank-${index + 1}">
                    <div class="rank-badge">${rankEmojis[index]}</div>
                    <div class="spender-name">${user.username}</div>
                    <div class="spender-oshi">❤️ ${user.oshi || '-'}</div>
                    <div class="spender-count">${user.totalCheki} Cheki</div>
                </div>
            `).join('');

        } catch (error) {
            console.error("Gagal memuat leaderboard:", error);
            loadingDiv.textContent = "Gagal memuat data sultan.";
        }
    }

    // Panggil fungsi leaderboard
    fetchDashboardLeaderboard();


    // --- LOGIKA RIWAYAT TIKET (SAMA SEPERTI SEBELUMNYA) ---
    const ticketContainer = document.getElementById('ticket-container');
    const logoutBtn = document.getElementById('logout-btn');

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });

    async function fetchOrders() {
        // Show skeleton loading while fetching
        showSkeletonTickets();

        try {
            const response = await fetch('/api/my-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal mengambil data pesanan.');

            const orders = await response.json();
            renderTickets(orders);
        } catch (error) {
            ticketContainer.innerHTML = `<p class="error-msg">${error.message}</p>`;
        }
    }

    function showSkeletonTickets() {
        if (!ticketContainer) return;
        ticketContainer.innerHTML = `
            <div class="skeleton skeleton-ticket"></div>
            <div class="skeleton skeleton-ticket"></div>
            <div class="skeleton skeleton-ticket"></div>
        `;
    }

    function renderTickets(orders) {
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

        // Sort: Tiket berlaku paling atas, kemudian sort by tanggal terbaru
        orders.sort((a, b) => {
            // Prioritas 1: Tiket berlaku di atas
            if (a.status_tiket === 'berlaku' && b.status_tiket !== 'berlaku') return -1;
            if (a.status_tiket !== 'berlaku' && b.status_tiket === 'berlaku') return 1;

            // Prioritas 2: Dalam kategori yang sama, tiket terbaru di atas
            const dateA = new Date(a.dibuat_pada || 0);
            const dateB = new Date(b.dibuat_pada || 0);
            return dateB - dateA; // Descending order (terbaru dulu)
        });

        ticketContainer.innerHTML = '';
        orders.forEach(order => {
            if (order.status_tiket === 'pending') return;

            const card = document.createElement('div');
            const isUsed = order.status_tiket !== 'berlaku';
            card.className = `ticket-card ${isUsed ? 'ticket-used' : ''}`;

            const itemsList = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join('<br>') || 'Tidak ada detail item.';

            let statusBadge = '';
            if (order.status_tiket === 'berlaku') {
                statusBadge = '<span style="background:#28a745;color:white;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">✓ BERLAKU</span>';
            } else if (order.status_tiket === 'hangus' || order.status_tiket === 'sudah_dipakai') {
                statusBadge = '<span style="background:#6c757d;color:white;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">✗ SUDAH TERPAKAI</span>';
            } else {
                statusBadge = `<span style="background:#ffc107;color:#000;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">${order.status_tiket.toUpperCase()}</span>`;
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

            // Generate QR Code
            if (order.status_tiket === 'berlaku') {
                const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
                if (qrCanvas && typeof QRCode !== 'undefined') {
                    const qrItems = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'N/A';
                    // Data QR: ID Pesanan + Username untuk verifikasi admin
                    const qrData = `ID:${order.id_pesanan}|U:${userData.nama_pengguna}`;

                    QRCode.toCanvas(qrCanvas, qrData, { width: 120, margin: 1 }, (error) => {
                        if (error) console.error('QR Code Error:', error);
                    });
                }
            }
        });
    }

    fetchOrders();
});