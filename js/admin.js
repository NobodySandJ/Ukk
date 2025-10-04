// File: js/admin.js
// Versi final dengan perbaikan fetch data dan penambahan fitur reset password.

document.addEventListener('DOMContentLoaded', function() {
    // --- Cek Otentikasi & Otorisasi ---
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        alert('Akses ditolak. Silakan login sebagai admin.');
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
            renderOrders(allOrders);

            // Panggil API publik untuk stok secara terpisah
            const stockRes = await fetch('/api/products-and-stock');
            if (!stockRes.ok) throw new Error('Gagal memuat data stok.');
            
            const stockData = await stockRes.json();
            if(currentStockEl) currentStockEl.textContent = stockData.cheki_stock;

        } catch (error) {
            alert(error.message);
            // Jika ada error otorisasi, lebih baik logout paksa
            if (error.message.includes("403") || error.message.includes("admin")) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        }
    };
    
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
    
    function renderOrders(orders) {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tidak ada tiket yang perlu dikelola.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            const items = order.detail_item?.map(item => `${item.quantity}x ${item.name.replace('Cheki ', '')}`).join(', ') || 'N/A';
            const isUsed = order.status_tiket === 'sudah_dipakai';
            const statusClass = isUsed ? 'status-hangus' : 'status-berlaku';
            const statusText = isUsed ? 'Sudah Dipakai' : 'Berlaku';

            row.innerHTML = `
                <td data-label="ID Pesanan"><small>${order.id_pesanan}</small></td>
                <td data-label="Pelanggan">${order.nama_pelanggan}</td>
                <td data-label="Detail Item">${items}</td>
                <td data-label="Status Tiket"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td data-label="Aksi">
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
            alert('Terjadi kesalahan: ' + error.message);
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
            alert('Tiket berhasil digunakan.');
            fetchAdminData();
        } catch (error) { /* Error ditangani di apiRequest */ }
    }

    async function updateChekiStock(change) {
        try {
            const result = await apiRequest('/api/admin/update-cheki-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ changeValue: change })
            });
            alert(result.message);
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
            alert(result.message); // Tampilkan password baru dari server
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

    ordersTbody?.addEventListener('click', e => {
        const useButton = e.target.closest('.btn-use');
        if (useButton) {
            const orderId = useButton.dataset.orderid;
            if (confirm(`Yakin ingin menggunakan tiket untuk pesanan ${orderId}?`)) {
                useTicket(orderId);
            }
        }
    });
    
    increaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(value); else alert('Masukkan jumlah yang valid.');
    });

    decreaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(-value); else alert('Masukkan jumlah yang valid.');
    });

    // Reset Password
    userSearchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => u.nama_pengguna.toLowerCase().includes(term));
        renderUsers(filtered);
    });

    userListTbody?.addEventListener('click', e => {
        const resetButton = e.target.closest('.btn-reset');
        if (resetButton) {
            const userId = resetButton.dataset.userid;
            const username = resetButton.dataset.username;
            if (confirm(`Anda yakin ingin mereset password untuk pengguna "${username}"?`)) {
                resetUserPassword(userId);
            }
        }
    });

    // --- Inisialisasi Halaman ---
    showDashboard();
    fetchAdminData();
});