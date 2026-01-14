// File: js/admin.js
// Versi final dengan perbaikan fetch data dan penambahan fitur reset password.

document.addEventListener('DOMContentLoaded', function () {
    // --- Cek Otentikasi & Otorisasi ---
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        showToast('Akses ditolak. Silakan login sebagai admin.', 'error');
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    // --- Selektor DOM ---
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
    let salesChart = null; // Chart.js instance
    let lastUsedTicket = null; // Track last used ticket for undo

    // --- Inisialisasi ---
    if (adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    // --- Fungsi Navigasi ---
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
        fetchAllUsers(); // Panggil fungsi untuk memuat data pengguna
    }

    // --- **PERBAIKAN UTAMA ADA DI FUNGSI INI** ---
    const fetchAdminData = async () => {
        // Show skeleton loading
        showDashboardSkeleton();

        try {
            // Panggil API yang butuh otorisasi
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            const [statsRes, ordersRes] = await Promise.all([
                fetch('/api/admin/stats', { headers: authHeaders }),
                fetch('/api/admin/all-orders', { headers: authHeaders })
            ]);

            if (!statsRes.ok) throw new Error(`Gagal memuat statistik (Error: ${statsRes.status}). Pastikan Anda adalah admin.`);
            if (!ordersRes.ok) throw new Error(`Gagal memuat pesanan (Error: ${ordersRes.status}).`);

            const stats = await statsRes.json();
            allOrders = await ordersRes.json();

            renderStats(stats);
            renderCharts(stats); // Render visual charts
            renderOrders(allOrders);

            // Panggil API publik untuk stok secara terpisah
            const stockRes = await fetch('/api/products-and-stock');
            if (!stockRes.ok) throw new Error('Gagal memuat data stok.');

            const stockData = await stockRes.json();
            if (currentStockEl) currentStockEl.textContent = stockData.cheki_stock;

        } catch (error) {
            showToast(error.message, 'error');
            // Jika ada error otorisasi, lebih baik logout paksa
            if (error.message.includes("403") || error.message.includes("admin")) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        }
    };

    // --- Fungsi Skeleton Loading ---
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

    // --- Fungsi Render Tampilan (Dashboard) ---
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

    // --- Fungsi Render Charts (BARU) ---
    function renderCharts(stats) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        // Destroy chart lama jika ada
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

    // --- Modern Confirmation Dialog ---
    function showConfirm(message, onConfirm, onCancel) {
        const confirmToast = document.createElement('div');
        confirmToast.className = 'toast toast-confirm';
        confirmToast.style.cssText = `
            background: white;
            color: #1f2937;
            border-left: 4px solid #f59e0b;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            padding: 1.2rem;
            min-width: 350px;
        `;

        confirmToast.innerHTML = `
            <div style="margin-bottom: 1rem; font-weight: 500;">${message}</div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="confirm-cancel" style="padding: 0.5rem 1rem; border: 1px solid #d1d5db; background: white; color: #6b7280; border-radius: 6px; cursor: pointer; font-weight: 500;">Batal</button>
                <button class="confirm-yes" style="padding: 0.5rem 1rem; border: none; background: #ef4444; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">Ya, Lanjutkan</button>
            </div>
        `;

        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        toastContainer.appendChild(confirmToast);

        const yesBtn = confirmToast.querySelector('.confirm-yes');
        const cancelBtn = confirmToast.querySelector('.confirm-cancel');

        const cleanup = () => {
            confirmToast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => confirmToast.remove(), 300);
        };

        yesBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(container);
        return container;
    }

    function renderOrders(orders) {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada tiket yang perlu dikelola.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            const items = order.detail_item?.map(item => `${item.quantity}x ${item.name.replace('Cheki ', '')}`).join(', ') || 'N/A';

            // Format timestamp
            const createdAt = order.dibuat_pada
                ? new Date(order.dibuat_pada).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : '-';

            const isUsed = order.status_tiket === 'sudah_dipakai';
            const statusClass = isUsed ? 'status-hangus' : 'status-berlaku';
            const statusText = isUsed ? 'Sudah Dipakai' : 'Berlaku';

            row.innerHTML = `
                <td data-label="ID Pesanan"><small>${order.id_pesanan}</small></td>
                <td data-label="Pelanggan">${order.nama_pelanggan}</td>
                <td data-label="Detail Item">${items}</td>
                <td data-label="Dibuat Pada"><small>${createdAt}</small></td>
                <td data-label="Status Tiket"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td data-label="Aksi" style="white-space: nowrap;">
                    <button class="action-btn btn-use" data-orderid="${order.id_pesanan}" ${isUsed ? 'disabled' : ''}>
                        <i class="fas fa-check"></i> Gunakan
                    </button>
                </td>
            `;
            ordersTbody.appendChild(row);
        });
    }

    // --- Fungsi Render Tampilan (Reset Password) ---
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
                    <button class="action-btn btn-reset" data-userid="${user.id}" data-username="${user.nama_pengguna}">
                        <i class="fas fa-key"></i> Reset Password
                    </button>
                </td>
            `;
            userListTbody.appendChild(row);
        });
    }

    // --- Fungsi Aksi (API Calls) ---
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

    async function useTicket(orderId) {
        try {
            await apiRequest('/api/admin/update-ticket-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ order_id: orderId, new_status: 'sudah_dipakai' })
            });

            // Save for undo
            lastUsedTicket = { orderId, timestamp: Date.now() };

            // Show success with undo option
            showToastWithUndo('Tiket berhasil digunakan.', () => undoUseTicket(orderId));
            fetchAdminData();
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    async function undoUseTicket(orderId) {
        if (!lastUsedTicket || lastUsedTicket.orderId !== orderId) {
            showToast('Undo tidak tersedia untuk tiket ini.', 'error');
            return;
        }

        // Check if within 5 seconds
        const elapsedTime = Date.now() - lastUsedTicket.timestamp;
        if (elapsedTime > 5000) {
            showToast('Waktu undo telah habis.', 'error');
            return;
        }

        try {
            await apiRequest('/api/admin/update-ticket-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ order_id: orderId, new_status: 'berlaku' })
            });
            showToast('Tiket berhasil di-undo dan kembali berlaku.', 'success');
            lastUsedTicket = null;
            fetchAdminData();
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    function showToastWithUndo(message, undoCallback) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.style.cssText = `
            background: #10b981;
            color: white;
            padding: 1rem 1.2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            min-width: 350px;
        `;

        toast.innerHTML = `
            <span>${message}</span>
            <button class="undo-btn" style="padding: 0.4rem 0.8rem; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem;">UNDO</button>
        `;

        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        toastContainer.appendChild(toast);

        const undoBtn = toast.querySelector('.undo-btn');
        let undoAvailable = true;

        undoBtn.onclick = () => {
            if (undoAvailable) {
                undoCallback();
                toast.remove();
            }
        };

        // Auto remove after 5 seconds
        setTimeout(() => {
            undoAvailable = false;
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

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

    // --- Fungsi Aksi Reset Password (BARU) ---
    async function fetchAllUsers() {
        try {
            const users = await apiRequest('/api/admin/all-users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            allUsers = users;
            renderUsers(allUsers);
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    async function resetUserPassword(userId) {
        try {
            const result = await apiRequest('/api/admin/reset-user-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: userId })
            });
            showToast(result.message, 'success'); // Tampilkan password baru dari server
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    // --- Event Listeners ---
    logoutBtn?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Navigasi
    navDashboard?.addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });
    navResetPassword?.addEventListener('click', (e) => { e.preventDefault(); showResetPassword(); });
    backToDashboardBtn?.addEventListener('click', showDashboard);

    // Dashboard
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allOrders.filter(o =>
            o.nama_pelanggan.toLowerCase().includes(term) ||
            o.id_pesanan.toLowerCase().includes(term)
        );
        renderOrders(filtered);
    });

    // Use event delegation for dynamically created buttons
    document.body.addEventListener('click', e => {
        // Handle ticket usage button
        const useButton = e.target.closest('.btn-use');
        if (useButton && ordersTbody?.contains(useButton)) {
            const orderId = useButton.dataset.orderid;
            if (!orderId) return;

            showConfirm(
                `Yakin ingin menggunakan tiket untuk pesanan <strong>${orderId}</strong>?`,
                () => useTicket(orderId)
            );
            return;
        }

        // Handle user reset button
        const resetButton = e.target.closest('.btn-reset');
        if (resetButton && userListTbody?.contains(resetButton)) {
            const userId = resetButton.dataset.userid;
            const username = resetButton.dataset.username;
            if (!userId || !username) return;

            showConfirm(
                `Anda yakin ingin mereset password untuk pengguna <strong>"${username}"</strong>?`,
                () => resetUserPassword(userId)
            );
        }
    });

    increaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(value); else showToast('Masukkan jumlah yang valid.', 'warning');
    });

    decreaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(-value); else showToast('Masukkan jumlah yang valid.', 'warning');
    });

    // Reset Password
    userSearchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => u.nama_pengguna.toLowerCase().includes(term));
        renderUsers(filtered);
    });

    // --- Inisialisasi Halaman ---
    showDashboard();
    fetchAdminData();
});