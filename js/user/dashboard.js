// Konfigurasi dasar jalur berkas (File Path)
if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || '../../';
}
var basePath = window.basePath;

document.addEventListener('DOMContentLoaded', function () {
    // Memeriksa status login pengguna
    // Pengalihan ke halaman utama jika belum login
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData) {
        window.location.href = `${basePath}index.html`;
        return;
    }
    // Pengalihan ke panel admin jika peran pengguna adalah 'admin'
    if (userData.peran === 'admin') {
        window.location.href = `${basePath}pages/admin/index.html`;
        return;
    }

    // ============================================================
    // PEMBERITAHUAN KEBERHASILAN PEMBAYARAN (Dari Pengalihan)
    // ============================================================
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
        showToast('Pembayaran Berhasil! Tiket Anda sudah tersedia di bawah.', 'success');

        // Gulir otomatis ke bagian tiket
        setTimeout(() => {
            const ticketSection = document.getElementById('ticket-container');
            if (ticketSection) {
                ticketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 1000); // Penundaan sejenak agar rendering selesai

        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ============================================================
    // PENGATURAN TAMPILAN PROFIL PENGGUNA (Nama, Oshi, Lencana)
    // Modifikasi bagian ini untuk mengubah desain profil
    // ============================================================
    const usernameDisplay = document.getElementById('username-display');
    const oshiDisplay = document.getElementById('oshi-display');
    const profileImg = document.getElementById('profile-oshi-img');
    const userBadges = document.getElementById('user-badges');
    const leaderboardTitle = document.getElementById('leaderboard-title');

    if (usernameDisplay) {
        usernameDisplay.textContent = userData.nama_pengguna.toUpperCase();
    }

    // Menampilkan nama Oshi
    if (oshiDisplay && userData.oshi) {
        oshiDisplay.innerHTML = `❤️ Oshi: ${userData.oshi}`;
    }

    // Memperbarui judul peringkat (Leaderboard) berdasarkan Oshi
    if (leaderboardTitle && userData.oshi) {
        leaderboardTitle.innerHTML = `<i class="fas fa-trophy"></i> TOP SPENDER ${userData.oshi.toUpperCase()}`;
    }

    // ============================================================
    // FUNGSI UNTUK MENDAPATKAN GAMBAR OSHI
    // Pastikan berkas gambar tersedia di folder img/member/ (huruf kecil)
    // ============================================================
    function getOshiImage(oshiName) {
        if (!oshiName || oshiName === 'All Member') return `${basePath}img/logo/apple-touch-icon.png`;
        return `${basePath}img/member/${oshiName.toLowerCase()}.webp`;
    }

    // Memperbarui Foto Profil & Lencana (Badge)
    if (profileImg && userData.oshi) {
        profileImg.src = getOshiImage(userData.oshi);

        // Tampilkan lencana jika pengguna memiliki Oshi spesifik
        if (userData.oshi !== 'All Member') {
            if (userBadges) {
                userBadges.innerHTML = '';
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.style.cssText = "background: #ffebee; color: #c62828; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";
                badge.innerHTML = `<i class="fas fa-heart"></i> Team ${userData.oshi}`;
                userBadges.appendChild(badge);
            }
        }
    }

    // ============================================================
    // MENGAMBIL DATA PERINGKAT UNTUK DASHBOARD (Pratinjau Top 3)
    // ============================================================
    async function fetchDashboardLeaderboard() {
        const loadingDiv = document.getElementById('dashboard-leaderboard-loading');
        const container = document.getElementById('top-spenders-container');

        if (!container || !loadingDiv) return;

        const userOshi = userData.oshi;
        const isGlobal = !userOshi || userOshi === 'All Member';

        try {
            let response;
            if (isGlobal) {
                response = await fetch('/api/leaderboard');
            } else {
                response = await fetch(`/api/leaderboard-per-member?memberName=${encodeURIComponent(userOshi)}`);
            }

            // Memeriksa status respons HTTP
            if (!response.ok) {
                throw new Error(`Kesalahan HTTP! status: ${response.status}`);
            }

            const data = await response.json();

            // Memastikan data yang diterima berbentuk Array
            if (!Array.isArray(data) || data.length === 0) {
                loadingDiv.textContent = isGlobal
                    ? "Belum ada transaksi saat ini."
                    : `Belum ada transaksi pembelian untuk ${userOshi} saat ini.`;
                return;
            }

            loadingDiv.style.display = 'none';
            container.style.display = 'flex';

            const top3 = data.slice(0, 3);
            const rankEmojis = ['🥇', '🥈', '🥉'];

            container.innerHTML = top3.map((user, index) => `
                <div class="top-spender-card rank-${index + 1}">
                    <div class="rank-badge">${rankEmojis[index]}</div>
                    <div class="spender-name">${user.username}</div>
                    <div class="spender-count">${user.totalQuantity || user.totalCheki || 0} Cheki</div>
                </div>
            `).join('');

        } catch (error) {
            console.error("Gagal memuat leaderboard:", error);
            loadingDiv.textContent = "Gagal memuat data Leaderboard.";
        }
    }

    fetchDashboardLeaderboard();


    // ============================================================
    // LOGIKA UI KELUAR (LOGOUT)
    // ============================================================
    const ticketContainer = document.getElementById('ticket-container');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const cancelLogoutBtn = document.getElementById('cancel-logout');
    const confirmLogoutBtn = document.getElementById('confirm-logout');

    // Membuka modal konfirmasi keluar
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('Tombol Keluar diklik');
            if (logoutModal) {
                logoutModal.classList.add('active');
            }
        });
    }

    // Membatalkan aksi keluar
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', () => {
            if (logoutModal) {
                logoutModal.classList.remove('active');
            }
        });
    }

    // Menutup modal jika area luar diklik
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.classList.remove('active');
            }
        });
    }

    // Konfirmasi keluar
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            if (typeof showToast === 'function') {
                showToast('Anda telah keluar. Sampai jumpa!', 'success');
            }
            setTimeout(() => {
                window.location.href = `${basePath}index.html`;
            }, 1000);
        });
    }

    // ============================================================
    // MENGAMBIL RIWAYAT PESANAN DARI SERVER
    // ============================================================
    async function fetchOrders() {
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

    // ============================================================
    // MENAMPILKAN KARTU TIKET KE UI
    // Fungsi ini menangani rendering tampilan riwayat tiket
    // ============================================================
    function renderTickets(orders) {
        if (orders.length === 0) {
            ticketContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <p style="margin-bottom: 1.5rem; color: #6c757d;">Anda belum memiliki tiket saat ini.</p>
                    <a href="${basePath}pages/public/cheki.html" class="cta-button">
                        <i class="fas fa-ticket-alt"></i> Beli Tiket Cheki Sekarang
                    </a>
                </div>
            `;
            return;
        }

        // Urutan: Tiket aktif ditampilkan paling atas, diikuti tiket terbaru
        orders.sort((a, b) => {
            if (a.status_tiket === 'berlaku' && b.status_tiket !== 'berlaku') return -1;
            if (a.status_tiket !== 'berlaku' && b.status_tiket === 'berlaku') return 1;

            const dateA = new Date(a.dibuat_pada || 0);
            const dateB = new Date(b.dibuat_pada || 0);
            return dateB - dateA;
        });

        ticketContainer.innerHTML = '';
        orders.forEach(order => {
            if (order.status_tiket === 'pending') return;

            const card = document.createElement('div');
            const isUsed = order.status_tiket !== 'berlaku';
            card.className = `ticket-card ${isUsed ? 'ticket-used' : ''}`;

            const itemsList = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join('<br>') || 'Tidak ada rincian item.';

            // Lencana status tiket
            let statusBadge = '';
            if (order.status_tiket === 'berlaku') {
                statusBadge = '<span style="background:#28a745;color:white;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">✓ BERLAKU</span>';
            } else if (order.status_tiket === 'hangus' || order.status_tiket === 'sudah_dipakai') {
                statusBadge = '<span style="background:#6c757d;color:white;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">✗ SUDAH TERPAKAI</span>';
            } else {
                statusBadge = `<span style="background:#ffc107;color:#000;padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:bold;">${order.status_tiket.toUpperCase()}</span>`;
            }

            // Kode QR atau label status penggunaan
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

            // Membuat Kode QR untuk tiket yang masih berlaku
            if (order.status_tiket === 'berlaku') {
                const qrCanvas = document.getElementById(`qr-${order.id_pesanan}`);
                if (qrCanvas && typeof QRCode !== 'undefined') {
                    // Format Teks QR: ID | Pengguna | Daftar Item
                    const itemsText = (order.detail_item || [])
                        .map(item => `${item.quantity}x ${item.name}`)
                        .join(', ');

                    const qrData = `ORDER: ${order.id_pesanan}\nUSER: ${userData.nama_pengguna}\nITEMS: ${itemsText}`;

                    QRCode.toCanvas(qrCanvas, qrData, { width: 256, margin: 2 }, (error) => {
                        if (error) console.error('QR Code Error:', error);
                    });
                }
            }
        });
    }

    fetchOrders();

    // ============================================================
    // ULASAN (REVIEW) - Cek Eligibility & Tampilkan Form
    // ============================================================
    async function loadReviewSection() {
        const area = document.getElementById('review-form-area');
        if (!area) return;

        try {
            // Cek apakah user boleh review
            const eligRes = await fetch('/api/reviews/eligibility', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!eligRes.ok) throw new Error('Gagal cek eligibility');
            const { eligible, hasReview } = await eligRes.json();

            if (!eligible) {
                area.innerHTML = `
                    <div style="text-align:center; padding:1.5rem; background:#f8f9fa; border-radius:12px; color:#666;">
                        <i class="fas fa-lock" style="font-size:2rem; margin-bottom:0.75rem; display:block; color:#aaa;"></i>
                        <p style="margin:0;">Anda harus <strong>membeli dan menggunakan tiket cheki</strong> terlebih dahulu untuk memberikan ulasan.</p>
                        <a href="../public/cheki.html" style="display:inline-block; margin-top:1rem; color:var(--primary-color); font-weight:600;">Beli Tiket →</a>
                    </div>`;
                return;
            }

            if (hasReview) {
                // Load existing review for editing
                const myRes = await fetch('/api/reviews/my-review', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const myReview = await myRes.json();
                if (myReview) {
                    renderReviewForm(area, myReview.rating, myReview.komentar, true);
                    return;
                }
            }

            // Show empty form
            renderReviewForm(area, 0, '', false);
        } catch (e) {
            area.innerHTML = '<p style="color:#888;">Gagal memuat fitur ulasan.</p>';
        }
    }

    function renderReviewForm(container, currentRating, currentComment, isEdit) {
        let selectedRating = currentRating;
        
        container.innerHTML = `
            <div style="background:#f8f9fa; border-radius:12px; padding:1.5rem; text-align:left;">
                ${isEdit ? '<p style="color:#059669; font-weight:600; margin-bottom:1rem;"><i class="fas fa-check-circle"></i> Ulasan Anda sudah terkirim. Anda dapat mengeditnya di bawah.</p>' : ''}
                <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Rating</label>
                <div id="star-rating" style="font-size:2rem; cursor:pointer; margin-bottom:1rem; letter-spacing:4px;">
                    ${'☆'.repeat(5)}
                </div>
                <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Komentar</label>
                <textarea id="review-comment" rows="3" maxlength="500" placeholder="Ceritakan pengalaman cheki kamu..." 
                    style="width:100%; padding:0.75rem; border:1px solid #ddd; border-radius:8px; font-size:0.95rem; resize:vertical; font-family:inherit;"
                >${currentComment}</textarea>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
                    <small id="review-char-count" style="color:#888;">${currentComment.length}/500</small>
                    <button id="submit-review-btn" 
                            style="background:var(--primary-color); color:white; border:none; padding:0.6rem 1.5rem; border-radius:8px; font-weight:600; cursor:pointer; font-size:0.95rem;">
                        <i class="fas fa-paper-plane"></i> ${isEdit ? 'Perbarui Ulasan' : 'Kirim Ulasan'}
                    </button>
                </div>
            </div>`;

        // Star rating interaction
        const starContainer = document.getElementById('star-rating');
        const updateStars = (rating) => {
            starContainer.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('span');
                star.textContent = i <= rating ? '★' : '☆';
                star.style.color = i <= rating ? '#f59e0b' : '#ddd';
                star.style.cursor = 'pointer';
                star.style.transition = 'transform 0.15s';
                star.onmouseenter = () => star.style.transform = 'scale(1.2)';
                star.onmouseleave = () => star.style.transform = '';
                star.onclick = () => { selectedRating = i; updateStars(i); };
                starContainer.appendChild(star);
            }
        };
        updateStars(selectedRating);

        // Character counter
        const textarea = document.getElementById('review-comment');
        const charCount = document.getElementById('review-char-count');
        textarea.addEventListener('input', () => {
            charCount.textContent = `${textarea.value.length}/500`;
        });

        // Submit handler
        document.getElementById('submit-review-btn').addEventListener('click', async () => {
            const komentar = textarea.value.trim();
            if (selectedRating < 1) {
                showToast('Pilih rating terlebih dahulu!', 'warning');
                return;
            }
            if (komentar.length < 5) {
                showToast('Komentar minimal 5 karakter.', 'warning');
                return;
            }

            const btn = document.getElementById('submit-review-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

            try {
                const res = await fetch('/api/reviews', {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ rating: selectedRating, komentar })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Gagal mengirim ulasan');

                showToast(isEdit ? 'Ulasan diperbarui!' : 'Ulasan berhasil dikirim!', 'success');
                // Reload the review section to show updated state
                loadReviewSection();
            } catch (e) {
                showToast(e.message, 'error');
                btn.disabled = false;
                btn.innerHTML = `<i class="fas fa-paper-plane"></i> ${isEdit ? 'Perbarui Ulasan' : 'Kirim Ulasan'}`;
            }
        });
    }

    loadReviewSection();
});