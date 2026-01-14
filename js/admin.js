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

    // --- Modern Centered Modal Confirmation ---
    function showConfirm(message, onConfirm, onCancel) {
        console.log('showConfirm called with message:', message);

        // Create backdrop overlay
        const backdrop = document.createElement('div');
        backdrop.id = 'confirm-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 99998;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.style.cssText = `
            background: white;
            color: #1f2937;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            padding: 2rem;
            min-width: 400px;
            max-width: 500px;
            z-index: 99999;
            border-radius: 16px;
            animation: scaleIn 0.2s ease-out;
            text-align: center;
        `;

        modal.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <i class="fas fa-question-circle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600;">Konfirmasi</h3>
                <p style="margin: 0; color: #6b7280; font-size: 1rem; line-height: 1.6;">${message}</p>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="confirm-cancel" style="padding: 0.75rem 2rem; border: 2px solid #d1d5db; background: white; color: #6b7280; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 1rem;">Batal</button>
                <button class="confirm-yes" style="padding: 0.75rem 2rem; border: none; background: linear-gradient(135deg, #16a34a, #15803d); color: white; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3); font-size: 1rem;">Ya, Gunakan</button>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Add CSS animations if not exists
        if (!document.getElementById('confirm-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'confirm-modal-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes scaleOut {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(0.9); }
                }
            `;
            document.head.appendChild(style);
        }

        console.log('Confirm modal added to DOM');

        const yesBtn = modal.querySelector('.confirm-yes');
        const cancelBtn = modal.querySelector('.confirm-cancel');

        // Add hover effects
        yesBtn.onmouseenter = () => { yesBtn.style.transform = 'translateY(-2px)'; yesBtn.style.boxShadow = '0 6px 16px rgba(22, 163, 74, 0.4)'; };
        yesBtn.onmouseleave = () => { yesBtn.style.transform = 'translateY(0)'; yesBtn.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)'; };
        cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#f3f4f6'; cancelBtn.style.borderColor = '#9ca3af'; };
        cancelBtn.onmouseleave = () => { cancelBtn.style.background = 'white'; cancelBtn.style.borderColor = '#d1d5db'; };

        const cleanup = () => {
            backdrop.style.animation = 'fadeOut 0.2s ease-in';
            modal.style.animation = 'scaleOut 0.2s ease-in';
            setTimeout(() => backdrop.remove(), 200);
        };

        yesBtn.onclick = () => {
            console.log('Yes button clicked');
            cleanup();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            console.log('Cancel button clicked');
            cleanup();
            if (onCancel) onCancel();
        };

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                console.log('Backdrop clicked - cancelling');
                cleanup();
                if (onCancel) onCancel();
            }
        };
    }

    function createToastContainer() {
        console.log('Creating toast container');
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 20px; 
            z-index: 99990;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
        `;

        // Allow pointer events on children
        const style = document.createElement('style');
        style.textContent = `
            #toast-container > * {
                pointer-events: auto;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(container);
        console.log('Toast container created and added to body');
        return container;
    }

    function renderOrders(orders) {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada tiket yang perlu dikelola.</td></tr>`;
            return;
        }

        const UNDO_DURATION = 15 * 60 * 1000; // 15 minutes in ms

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

            // Check if undo is available for this order
            const undoData = getUndoData(order.id_pesanan);
            const canUndo = isUsed && undoData && (Date.now() - undoData.timestamp < UNDO_DURATION);
            const remainingTime = canUndo ? Math.ceil((UNDO_DURATION - (Date.now() - undoData.timestamp)) / 1000) : 0;

            // Format remaining time
            const formatTime = (secs) => {
                const mins = Math.floor(secs / 60);
                const s = secs % 60;
                return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
            };

            let actionButton = '';
            if (!isUsed) {
                // Show Gunakan button
                actionButton = `
                    <button class="action-btn btn-use" data-orderid="${order.id_pesanan}">
                        <i class="fas fa-check"></i> Gunakan
                    </button>
                `;
            } else if (canUndo) {
                // Show Undo button with remaining time
                actionButton = `
                    <button class="action-btn btn-undo" data-orderid="${order.id_pesanan}" data-remaining="${remainingTime}">
                        <i class="fas fa-undo"></i> Undo (${formatTime(remainingTime)})
                    </button>
                `;
            } else {
                // Undo expired - show disabled button
                actionButton = `
                    <button class="action-btn btn-use" disabled style="opacity: 0.5; cursor: not-allowed;">
                        <i class="fas fa-ban"></i> Tidak bisa diundo
                    </button>
                `;
            }

            row.innerHTML = `
                <td data-label="ID Pesanan"><small>${order.id_pesanan}</small></td>
                <td data-label="Pelanggan">${order.nama_pelanggan}</td>
                <td data-label="Detail Item">${items}</td>
                <td data-label="Dibuat Pada"><small>${createdAt}</small></td>
                <td data-label="Status Tiket"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td data-label="Aksi" style="white-space: nowrap;">
                    ${actionButton}
                </td>
            `;
            ordersTbody.appendChild(row);
        });

        // Start countdown timers for undo buttons
        startUndoTimers();
    }

    // Store undo timestamps in localStorage
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

    // Update undo button timers every second
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
                    // Undo expired
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

        // Update every second
        if (window.undoTimerInterval) clearInterval(window.undoTimerInterval);
        window.undoTimerInterval = setInterval(updateTimers, 1000);
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

            // Save for undo in localStorage
            saveUndoData(orderId);

            // Show simple success toast
            showToast('Tiket berhasil digunakan. Anda bisa undo dalam 15 menit.', 'success');
            fetchAdminData();
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    async function undoUseTicket(orderId) {
        const undoData = getUndoData(orderId);
        if (!undoData) {
            showToast('Undo tidak tersedia untuk tiket ini.', 'error');
            return;
        }

        // Check if within 15 minutes (900000ms)
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

    function showToastWithUndo(message, undoCallback) {
        // Add animation styles if not exists
        if (!document.getElementById('toast-undo-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-undo-styles';
            style.textContent = `
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes toastSlideOut {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(100%); }
                }
                @keyframes countdownBar {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `;
            document.head.appendChild(style);
        }

        const UNDO_DURATION = 15 * 60 * 1000; // 15 minutes in ms
        const UNDO_SECONDS = 15 * 60; // 15 minutes in seconds

        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.style.cssText = `
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1.25rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            min-width: 400px;
            position: relative;
            overflow: hidden;
            animation: toastSlideIn 0.3s ease-out;
        `;

        // Format time display
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        };

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="fas fa-check-circle" style="font-size: 1.5rem;"></i>
                <span style="font-weight: 500; font-size: 1rem;">${message}</span>
            </div>
            <button class="undo-btn" style="padding: 0.6rem 1.2rem; background: rgba(255,255,255,0.25); border: 2px solid rgba(255,255,255,0.4); color: white; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px;">UNDO (15m)</button>
            <div style="position: absolute; bottom: 0; left: 0; height: 4px; background: rgba(255,255,255,0.5); animation: countdownBar ${UNDO_SECONDS}s linear forwards;"></div>
        `;

        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        toastContainer.appendChild(toast);

        const undoBtn = toast.querySelector('.undo-btn');
        let undoAvailable = true;
        let countdown = UNDO_SECONDS;

        // Update countdown every second
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                undoBtn.textContent = `UNDO (${formatTime(countdown)})`;
            } else {
                undoBtn.textContent = 'EXPIRED';
                undoBtn.style.opacity = '0.5';
                undoBtn.style.cursor = 'not-allowed';
            }
        }, 1000);

        // Add hover effect
        undoBtn.onmouseenter = () => { if (undoAvailable) { undoBtn.style.background = 'rgba(255,255,255,0.4)'; undoBtn.style.transform = 'scale(1.05)'; } };
        undoBtn.onmouseleave = () => { undoBtn.style.background = 'rgba(255,255,255,0.25)'; undoBtn.style.transform = 'scale(1)'; };

        undoBtn.onclick = () => {
            if (undoAvailable) {
                clearInterval(countdownInterval);
                undoCallback();
                toast.remove();
            }
        };

        // Auto remove after 15 minutes
        setTimeout(() => {
            undoAvailable = false;
            clearInterval(countdownInterval);
            toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, UNDO_DURATION);
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
        // Handle ticket usage button (Gunakan)
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

        // Handle undo button
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