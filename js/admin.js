// ================================================================
// FILE: admin.js - Logika Halaman Admin Panel
// ================================================================

document.addEventListener('DOMContentLoaded', function () {
    // ============================================================
    // CEK OTENTIKASI & OTORISASI ADMIN
    // ============================================================
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        showToast('Akses ditolak. Silakan login sebagai admin.', 'error');
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    // ============================================================
    // SELEKTOR DOM
    // ============================================================
    const adminWelcome = document.getElementById('admin-welcome');
    const logoutBtn = document.getElementById('admin-logout-btn');

    // Selektor View
    const dashboardViews = [
        document.getElementById('statistics'),
        document.getElementById('stock-management'),
        document.getElementById('orders-management')
    ];
    const resetPasswordView = document.getElementById('reset-password-view');

    // Selektor Navigasi
    const navDashboard = document.getElementById('nav-dashboard');
    const navResetPassword = document.getElementById('nav-reset-password');

    // Selektor Dashboard
    const statsGrid = document.getElementById('stats-grid');
    const ordersTbody = document.getElementById('orders-tbody');
    const searchInput = document.getElementById('search-input');
    const currentStockEl = document.getElementById('current-stock');
    const stockChangeInput = document.getElementById('stock-change-value');
    const increaseBtn = document.getElementById('increase-stock-btn');
    const decreaseBtn = document.getElementById('decrease-stock-btn');

    // Selektor Reset Password
    const userSearchInput = document.getElementById('user-search-input');
    const userListTbody = document.getElementById('user-list-tbody');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');

    let allOrders = [];
    let allUsers = [];
    let salesChart = null;

    // ============================================================
    // INISIALISASI
    // ============================================================
    if (adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    // ============================================================
    // FUNGSI NAVIGASI ANTAR VIEW
    // ============================================================
    function showDashboard() {
        dashboardViews.forEach(view => view.style.display = 'block');
        resetPasswordView.style.display = 'none';
        navDashboard.classList.add('active');
        navResetPassword.classList.remove('active');
    }

    function showResetPassword() {
        dashboardViews.forEach(view => view.style.display = 'none');
        resetPasswordView.style.display = 'block';
        navDashboard.classList.remove('active');
        navResetPassword.classList.add('active');
        fetchAllUsers();
    }

    // ============================================================
    // FETCH DATA ADMIN (Statistik, Pesanan, Stok)
    // ============================================================
    const fetchAdminData = async () => {
        showDashboardSkeleton();

        try {
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            const [statsRes, ordersRes] = await Promise.all([
                fetch('/api/admin/stats', { headers: authHeaders }),
                fetch('/api/admin/all-orders', { headers: authHeaders })
            ]);

            if (!statsRes.ok) throw new Error(`Gagal memuat statistik (Error: ${statsRes.status}).`);
            if (!ordersRes.ok) throw new Error(`Gagal memuat pesanan (Error: ${ordersRes.status}).`);

            const stats = await statsRes.json();
            allOrders = await ordersRes.json();

            renderStats(stats);
            renderCharts(stats);
            renderOrders(allOrders);

            // Fetch stok dari API publik
            const stockRes = await fetch('/api/products-and-stock');
            if (!stockRes.ok) throw new Error('Gagal memuat data stok.');

            const stockData = await stockRes.json();
            if (currentStockEl) currentStockEl.textContent = stockData.cheki_stock;

        } catch (error) {
            showToast(error.message, 'error');
            if (error.message.includes("403") || error.message.includes("admin")) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        }
    };

    // ============================================================
    // SKELETON LOADING
    // ============================================================
    function showDashboardSkeleton() {
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="skeleton skeleton-stat-card"></div>
                <div class="skeleton skeleton-stat-card"></div>
                <div class="skeleton skeleton-stat-card"></div>
            `;
        }
        if (ordersTbody) {
            ordersTbody.innerHTML = `
                <tr><td colspan="6"><div class="skeleton skeleton-table-row"></div></td></tr>
                <tr><td colspan="6"><div class="skeleton skeleton-table-row"></div></td></tr>
                <tr><td colspan="6"><div class="skeleton skeleton-table-row"></div></td></tr>
            `;
        }
    }

    // ============================================================
    // RENDER STATISTIK
    // Edit di sini untuk mengubah tampilan kartu statistik
    // ============================================================
    function renderStats(stats) {
        if (!statsGrid) return;
        statsGrid.innerHTML = `
            <div class="stat-card"><h3>Total Pendapatan</h3><p>Rp ${stats.totalRevenue.toLocaleString('id-ID')}</p></div>
            <div class="stat-card"><h3>Total Cheki Terjual</h3><p>${stats.totalCheki}</p></div>
            <div class="stat-card"><h3>Cheki per Member</h3><ul style="text-align:left; font-size: 0.9rem; list-style: inside;">
                ${Object.entries(stats.chekiPerMember).map(([name, count]) => `<li><strong>${name}:</strong> ${count} pcs</li>`).join('')}
            </ul></div>
        `;
    }

    // ============================================================
    // RENDER GRAFIK PENJUALAN (Chart.js)
    // ============================================================
    function renderCharts(stats) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        if (salesChart) {
            salesChart.destroy();
        }

        const memberNames = Object.keys(stats.chekiPerMember);
        const memberCounts = Object.values(stats.chekiPerMember);

        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: memberNames,
                datasets: [{
                    label: 'Tiket Terjual',
                    data: memberCounts,
                    backgroundColor: [
                        '#3b82f6', '#8b5cf6', '#ec4899',
                        '#10b981', '#f59e0b', '#ef4444',
                        '#06b6d4'
                    ],
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }

    // ============================================================
    // MODAL KONFIRMASI MODERN
    // ============================================================
    function showConfirm(message, onConfirm, onCancel) {
        const backdrop = document.createElement('div');
        backdrop.id = 'confirm-backdrop';
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); z-index: 99998;
            display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;

        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.style.cssText = `
            background: white; color: #1f2937; box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            padding: 2rem; min-width: 400px; max-width: 500px; z-index: 99999;
            border-radius: 16px; animation: scaleIn 0.2s ease-out; text-align: center;
        `;

        modal.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <i class="fas fa-question-circle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600;">Konfirmasi</h3>
                <p style="margin: 0; color: #6b7280; font-size: 1rem; line-height: 1.6;">${message}</p>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="confirm-cancel" style="padding: 0.75rem 2rem; border: 2px solid #d1d5db; background: white; color: #6b7280; border-radius: 10px; cursor: pointer; font-weight: 600;">Batal</button>
                <button class="confirm-yes" style="padding: 0.75rem 2rem; border: none; background: linear-gradient(135deg, #16a34a, #15803d); color: white; border-radius: 10px; cursor: pointer; font-weight: 600;">Ya, Lanjutkan</button>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Tambah animasi CSS jika belum ada
        if (!document.getElementById('confirm-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'confirm-modal-styles';
            style.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                @keyframes scaleOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.9); } }
            `;
            document.head.appendChild(style);
        }

        const cleanup = () => {
            backdrop.style.animation = 'fadeOut 0.2s ease-in';
            modal.style.animation = 'scaleOut 0.2s ease-in';
            setTimeout(() => backdrop.remove(), 200);
        };

        modal.querySelector('.confirm-yes').onclick = () => { cleanup(); if (onConfirm) onConfirm(); };
        modal.querySelector('.confirm-cancel').onclick = () => { cleanup(); if (onCancel) onCancel(); };
        backdrop.onclick = (e) => { if (e.target === backdrop) { cleanup(); if (onCancel) onCancel(); } };
    }

    // ============================================================
    // RENDER TABEL PESANAN/TIKET
    // Edit di sini untuk mengubah tampilan tabel tiket
    // ============================================================
    function renderOrders(orders) {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada tiket yang perlu dikelola.</td></tr>`;
            return;
        }

        const UNDO_DURATION = 15 * 60 * 1000; // 15 menit

        orders.forEach(order => {
            const row = document.createElement('tr');
            const items = order.detail_item?.map(item => `${item.quantity}x ${item.name.replace('Cheki ', '')}`).join(', ') || 'N/A';

            const createdAt = order.dibuat_pada
                ? new Date(order.dibuat_pada).toLocaleDateString('id-ID', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })
                : '-';

            const isUsed = order.status_tiket === 'sudah_dipakai';
            const statusClass = isUsed ? 'status-hangus' : 'status-berlaku';
            const statusText = isUsed ? 'Sudah Dipakai' : 'Berlaku';

            // Cek apakah bisa di-undo
            const undoData = getUndoData(order.id_pesanan);
            const canUndo = isUsed && undoData && (Date.now() - undoData.timestamp < UNDO_DURATION);
            const remainingTime = canUndo ? Math.ceil((UNDO_DURATION - (Date.now() - undoData.timestamp)) / 1000) : 0;

            const formatTime = (secs) => {
                const mins = Math.floor(secs / 60);
                const s = secs % 60;
                return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
            };

            let actionButton = '';
            if (!isUsed) {
                actionButton = `<button class="action-btn btn-use" data-orderid="${order.id_pesanan}"><i class="fas fa-check"></i> Gunakan</button>`;
            } else if (canUndo) {
                actionButton = `<button class="action-btn btn-undo" data-orderid="${order.id_pesanan}"><i class="fas fa-undo"></i> Undo (${formatTime(remainingTime)})</button>`;
            } else {
                actionButton = `<button class="action-btn btn-use" disabled style="opacity: 0.5; cursor: not-allowed;"><i class="fas fa-ban"></i> Tidak bisa diundo</button>`;
            }

            row.innerHTML = `
                <td data-label="ID Pesanan"><small>${order.id_pesanan}</small></td>
                <td data-label="Pelanggan">${order.nama_pelanggan}</td>
                <td data-label="Detail Item">${items}</td>
                <td data-label="Dibuat Pada"><small>${createdAt}</small></td>
                <td data-label="Status Tiket"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td data-label="Aksi" style="white-space: nowrap;">${actionButton}</td>
            `;
            ordersTbody.appendChild(row);
        });

        startUndoTimers();
    }

    // ============================================================
    // FUNGSI UNDO - Simpan timestamp ke localStorage
    // ============================================================
    function saveUndoData(orderId) {
        const undoTimestamps = JSON.parse(localStorage.getItem('undoTimestamps') || '{}');
        undoTimestamps[orderId] = { timestamp: Date.now() };
        localStorage.setItem('undoTimestamps', JSON.stringify(undoTimestamps));
    }

    function getUndoData(orderId) {
        const undoTimestamps = JSON.parse(localStorage.getItem('undoTimestamps') || '{}');
        return undoTimestamps[orderId];
    }

    function removeUndoData(orderId) {
        const undoTimestamps = JSON.parse(localStorage.getItem('undoTimestamps') || '{}');
        delete undoTimestamps[orderId];
        localStorage.setItem('undoTimestamps', JSON.stringify(undoTimestamps));
    }

    // Update timer undo setiap detik
    function startUndoTimers() {
        const UNDO_DURATION = 15 * 60 * 1000;

        const updateTimers = () => {
            const undoButtons = document.querySelectorAll('.btn-undo');
            undoButtons.forEach(btn => {
                const orderId = btn.dataset.orderid;
                const undoData = getUndoData(orderId);
                if (!undoData) return;

                const elapsed = Date.now() - undoData.timestamp;
                const remaining = Math.ceil((UNDO_DURATION - elapsed) / 1000);

                if (remaining <= 0) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.innerHTML = '<i class="fas fa-ban"></i> Expired';
                    btn.classList.remove('btn-undo');
                    removeUndoData(orderId);
                } else {
                    const mins = Math.floor(remaining / 60);
                    const secs = remaining % 60;
                    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                    btn.innerHTML = `<i class="fas fa-undo"></i> Undo (${timeStr})`;
                }
            });
        };

        if (window.undoTimerInterval) clearInterval(window.undoTimerInterval);
        window.undoTimerInterval = setInterval(updateTimers, 1000);
    }

    // ============================================================
    // RENDER TABEL USER (untuk Reset Password)
    // ============================================================
    function renderUsers(users) {
        if (!userListTbody) return;
        userListTbody.innerHTML = '';
        if (users.length === 0) {
            userListTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Tidak ada pengguna ditemukan.</td></tr>`;
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Username">${user.nama_pengguna}</td>
                <td data-label="Email">${user.email}</td>
                <td data-label="Aksi">
                    <button class="action-btn btn-generate-code" data-userid="${user.id}" data-username="${user.nama_pengguna}" data-email="${user.email}">
                        <i class="fas fa-key"></i> Generate Kode
                    </button>
                </td>
            `;
            userListTbody.appendChild(row);
        });
    }

    // ============================================================
    // FUNGSI API REQUEST
    // ============================================================
    async function apiRequest(url, options) {
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Operasi gagal.');
            return result;
        } catch (error) {
            showToast('Terjadi kesalahan: ' + error.message, 'error');
            throw error;
        }
    }

    // ============================================================
    // FUNGSI GUNAKAN TIKET
    // ============================================================
    async function useTicket(orderId) {
        try {
            await apiRequest('/api/admin/update-ticket-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ order_id: orderId, new_status: 'sudah_dipakai' })
            });

            saveUndoData(orderId);
            showToast('Tiket berhasil digunakan. Anda bisa undo dalam 15 menit.', 'success');
            fetchAdminData();
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    // ============================================================
    // FUNGSI UNDO PENGGUNAAN TIKET
    // ============================================================
    async function undoUseTicket(orderId) {
        const undoData = getUndoData(orderId);
        if (!undoData) {
            showToast('Undo tidak tersedia untuk tiket ini.', 'error');
            return;
        }

        const elapsedTime = Date.now() - undoData.timestamp;
        if (elapsedTime > 900000) {
            showToast('Waktu undo telah habis (maks 15 menit).', 'error');
            removeUndoData(orderId);
            return;
        }

        try {
            await apiRequest('/api/admin/update-ticket-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ order_id: orderId, new_status: 'berlaku' })
            });
            showToast('Tiket berhasil di-undo dan kembali berlaku.', 'success');
            removeUndoData(orderId);
            fetchAdminData();
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    // ============================================================
    // FUNGSI UPDATE STOK CHEKI
    // ============================================================
    async function updateChekiStock(change) {
        try {
            const result = await apiRequest('/api/admin/update-cheki-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ changeValue: change })
            });
            showToast(result.message, 'success');
            currentStockEl.textContent = result.newStock;
            stockChangeInput.value = '';
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    // ============================================================
    // FUNGSI FETCH SEMUA USER
    // ============================================================
    async function fetchAllUsers() {
        try {
            const users = await apiRequest('/api/admin/all-users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            allUsers = users;
            renderUsers(allUsers);
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    // ============================================================
    // FUNGSI GENERATE RESET CODE (OTP)
    // ============================================================
    async function generateResetCode(userId, username) {
        try {
            const result = await apiRequest('/api/admin/generate-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: userId })
            });

            // Tampilkan modal dengan kode OTP
            showCodeModal(result.code, result.expiresAt, username);

        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    // ============================================================
    // MODAL TAMPILKAN KODE OTP
    // ============================================================
    function showCodeModal(code, expiresAt, username) {
        const backdrop = document.createElement('div');
        backdrop.id = 'code-modal-backdrop';
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 99998;
            display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;

        const modal = document.createElement('div');
        modal.className = 'code-modal';
        modal.style.cssText = `
            background: white; color: #1f2937; box-shadow: 0 25px 60px rgba(0,0,0,0.3);
            padding: 2.5rem; min-width: 420px; max-width: 500px; z-index: 99999;
            border-radius: 20px; animation: scaleIn 0.2s ease-out; text-align: center;
        `;

        modal.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <i class="fas fa-key" style="font-size: 3rem; color: #10b981; margin-bottom: 1rem;"></i>
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600;">Kode Reset Password</h3>
                <p style="margin: 0; color: #6b7280; font-size: 0.95rem;">Untuk user: <strong>${username}</strong></p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px dashed #10b981; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <p style="margin: 0 0 0.5rem 0; color: #6b7280; font-size: 0.85rem;">Kode OTP (6 digit)</p>
                <div style="font-size: 2.5rem; font-weight: 700; letter-spacing: 8px; color: #047857; font-family: monospace;" id="otp-code-display">${code}</div>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.5rem; color: #6b7280;">
                <i class="fas fa-clock"></i>
                <span>Berlaku: <strong id="countdown-timer" style="color: #dc2626;">15:00</strong></span>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="copy-code-btn" style="padding: 0.75rem 1.5rem; border: none; background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-copy"></i> Salin Kode
                </button>
                <button id="close-code-modal" style="padding: 0.75rem 1.5rem; border: 2px solid #d1d5db; background: white; color: #6b7280; border-radius: 10px; cursor: pointer; font-weight: 600;">
                    Tutup
                </button>
            </div>
            
            <p style="margin-top: 1.5rem; font-size: 0.8rem; color: #9ca3af;">
                <i class="fas fa-info-circle"></i> Kirim kode ini ke user via WhatsApp. Kode hanya bisa dipakai sekali.
            </p>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Countdown Timer
        const timerEl = modal.querySelector('#countdown-timer');
        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, expiresAt - now);
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            if (remaining <= 0) {
                timerEl.textContent = 'KADALUARSA';
                timerEl.style.color = '#dc2626';
                clearInterval(timerInterval);
            }
        };
        updateTimer();
        const timerInterval = setInterval(updateTimer, 1000);

        // Copy button
        modal.querySelector('#copy-code-btn').onclick = () => {
            navigator.clipboard.writeText(code).then(() => {
                showToast('Kode berhasil disalin ke clipboard!', 'success');
            }).catch(() => {
                // Fallback untuk browser lama
                const textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showToast('Kode berhasil disalin!', 'success');
            });
        };

        // Close modal
        const cleanup = () => {
            clearInterval(timerInterval);
            backdrop.style.animation = 'fadeOut 0.2s ease-in';
            modal.style.animation = 'scaleOut 0.2s ease-in';
            setTimeout(() => backdrop.remove(), 200);
        };

        modal.querySelector('#close-code-modal').onclick = cleanup;
        backdrop.onclick = (e) => { if (e.target === backdrop) cleanup(); };
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    logoutBtn?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Navigasi
    navDashboard?.addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });
    navResetPassword?.addEventListener('click', (e) => { e.preventDefault(); showResetPassword(); });
    backToDashboardBtn?.addEventListener('click', showDashboard);

    // Search pesanan
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allOrders.filter(o =>
            o.nama_pelanggan.toLowerCase().includes(term) ||
            o.id_pesanan.toLowerCase().includes(term)
        );
        renderOrders(filtered);
    });

    // Delegasi event untuk tombol aksi
    document.body.addEventListener('click', e => {
        // Tombol Gunakan Tiket
        const useButton = e.target.closest('.btn-use');
        if (useButton && !useButton.disabled) {
            if (ordersTbody?.contains(useButton)) {
                const orderId = useButton.dataset.orderid;
                if (!orderId) return;

                showConfirm(
                    `Yakin ingin menggunakan tiket untuk pesanan <strong>${orderId}</strong>?`,
                    () => useTicket(orderId)
                );
                return;
            }
        }

        // Tombol Undo
        const undoButton = e.target.closest('.btn-undo');
        if (undoButton && !undoButton.disabled) {
            if (ordersTbody?.contains(undoButton)) {
                const orderId = undoButton.dataset.orderid;
                if (!orderId) return;

                showConfirm(
                    `Yakin ingin membatalkan penggunaan tiket <strong>${orderId}</strong>?`,
                    () => undoUseTicket(orderId)
                );
                return;
            }
        }

        // Tombol Generate Kode Reset
        const generateButton = e.target.closest('.btn-generate-code');
        if (generateButton && userListTbody?.contains(generateButton)) {
            const userId = generateButton.dataset.userid;
            const username = generateButton.dataset.username;
            const email = generateButton.dataset.email;
            if (!userId || !username) return;

            showConfirm(
                `<div style="text-align: left; margin-bottom: 1rem;">
                    <p style="margin: 0 0 0.5rem 0;"><strong>Yakin ingin generate kode reset untuk:</strong></p>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #4b5563;">
                        <li>Username: <strong>${username}</strong></li>
                        <li>Email: <strong>${email}</strong></li>
                    </ul>
                </div>
                <p style="margin: 0; font-size: 0.9rem; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Pastikan Anda sudah memverifikasi identitas user!</p>`,
                () => generateResetCode(userId, username)
            );
        }
    });

    // Tombol Tambah/Kurang Stok
    increaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(value); else showToast('Masukkan jumlah yang valid.', 'warning');
    });

    decreaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(-value); else showToast('Masukkan jumlah yang valid.', 'warning');
    });

    // Search user
    userSearchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => u.nama_pengguna.toLowerCase().includes(term));
        renderUsers(filtered);
    });

    // ============================================================
    // INISIALISASI HALAMAN
    // ============================================================
    showDashboard();
    fetchAdminData();
});