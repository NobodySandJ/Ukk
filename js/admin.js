document.addEventListener('DOMContentLoaded', function() {
    // Cek otentikasi admin
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        alert('Akses ditolak. Anda bukan admin atau sesi Anda telah berakhir.');
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    // --- Selektor DOM ---
    const adminWelcome = document.getElementById('admin-welcome');
    const logoutBtn = document.getElementById('admin-logout-btn');
    
    // View utama (Dashboard)
    const dashboardView = {
        stats: document.getElementById('statistics'),
        stock: document.getElementById('stock-management'),
        orders: document.getElementById('orders-management')
    };
    const ordersTbody = document.getElementById('orders-tbody');
    const searchInput = document.getElementById('search-input');
    
    // View Reset Password
    const resetPasswordView = document.getElementById('reset-password-view');
    const userListTbody = document.getElementById('user-list-tbody');
    const userSearchInput = document.getElementById('user-search-input');

    // Tombol Navigasi
    const navDashboard = document.getElementById('nav-dashboard');
    const navResetPassword = document.getElementById('nav-reset-password');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    
    let allOrders = [];
    let allUsers = [];

    // --- Fungsi Navigasi View ---
    function showView(viewName) {
        // Sembunyikan semua view
        Object.values(dashboardView).forEach(el => el.style.display = 'none');
        if (resetPasswordView) resetPasswordView.style.display = 'none';

        // Tampilkan view yang dipilih
        if (viewName === 'dashboard') {
            Object.values(dashboardView).forEach(el => el.style.display = 'block'); // atau 'grid' untuk stats
            dashboardView.stats.style.display = 'grid';
            navDashboard.classList.add('active');
            navResetPassword.classList.remove('active');
        } else if (viewName === 'resetPassword') {
            if (resetPasswordView) resetPasswordView.style.display = 'block';
            navDashboard.classList.remove('active');
            navResetPassword.classList.add('active');
            fetchAllUsers(); // Muat data pengguna saat view dibuka
        }
    }
    
    // Listener untuk navigasi
    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        showView('dashboard');
    });
    navResetPassword.addEventListener('click', (e) => {
        e.preventDefault();
        showView('resetPassword');
    });
    backToDashboardBtn.addEventListener('click', () => showView('dashboard'));


    // --- Fungsi Inisialisasi & Fetch Data ---
    if (adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    logoutBtn?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
    
    async function fetchAdminDashboardData() {
        try {
            const [statsRes, ordersRes] = await Promise.all([
                fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/all-orders', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!statsRes.ok || !ordersRes.ok) throw new Error('Gagal memuat data admin.');

            const stats = await statsRes.json();
            allOrders = await ordersRes.json();
            
            renderStats(stats);
            renderOrders(allOrders);
        } catch (error) {
            alert(error.message);
        }
    }

    async function fetchAllUsers() {
        if (allUsers.length > 0) return; // Jangan fetch ulang jika sudah ada
        try {
            const response = await fetch('/api/admin/all-users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal memuat daftar pengguna.');
            allUsers = await response.json();
            renderUsers(allUsers);
        } catch (error) {
            userListTbody.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`;
        }
    }


    // --- Fungsi Render ---
    function renderStats(stats) {
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="stat-card"><h3>Total Pendapatan</h3><p>Rp ${stats.totalRevenue.toLocaleString('id-ID')}</p></div>
            <div class="stat-card"><h3>Total Cheki Terjual</h3><p>${stats.totalCheki}</p></div>`;
        const memberCard = document.createElement('div');
        memberCard.className = 'stat-card';
        let memberStatsHTML = '<h3>Cheki per Member</h3><ul style="text-align:left; font-size: 1rem; list-style-position: inside;">';
        for (const member in stats.chekiPerMember) {
            memberStatsHTML += `<li><strong>${member}:</strong> ${stats.chekiPerMember[member]} pcs</li>`;
        }
        memberCard.innerHTML += memberStatsHTML + '</ul>';
        statsGrid.appendChild(memberCard);
    }
    
    function renderOrders(orders) {
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tidak ada pesanan.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            let items = order.detail_item?.map(item => `${item.quantity}x ${item.name}`).join('<br>') || 'Tidak ada detail';
            let statusClass = { berlaku: 'status-berlaku', hangus: 'status-hangus' }[order.status_tiket] || 'status-pending';
            let statusText = { berlaku: 'Berlaku', hangus: 'Hangus' }[order.status_tiket] || 'Pending';
            row.innerHTML = `
                <td data-label="ID Pesanan">${order.id_pesanan}</td>
                <td data-label="Pelanggan">${order.nama_pelanggan}<br><small>${order.email_pelanggan}</small></td>
                <td data-label="Detail Item">${items}</td>
                <td data-label="Status Tiket"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td data-label="Aksi"><button class="action-btn btn-delete" data-orderid="${order.id_pesanan}">Hapus</button></td>
            `;
            ordersTbody.appendChild(row);
        });
    }

    function renderUsers(users) {
        userListTbody.innerHTML = '';
        if (users.length === 0) {
            userListTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Tidak ada pengguna.</td></tr>`;
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

    // --- Event Listeners untuk Aksi ---
    searchInput?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredOrders = allOrders.filter(order => 
            order.nama_pelanggan?.toLowerCase().includes(searchTerm) ||
            order.id_pesanan?.toLowerCase().includes(searchTerm)
        );
        renderOrders(filteredOrders);
    });

    userSearchInput?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            user.nama_pengguna?.toLowerCase().includes(searchTerm)
        );
        renderUsers(filteredUsers);
    });
    
    // Listener untuk tombol hapus di tabel order
    ordersTbody?.addEventListener('click', async function(e) {
        const deleteButton = e.target.closest('.btn-delete');
        if (deleteButton) {
            const orderId = deleteButton.dataset.orderid;
            if (confirm(`YAKIN ingin MENGHAPUS pesanan ${orderId} secara permanen?`)) {
                deleteOrder(orderId);
            }
        }
    });

    // Listener untuk tombol reset di tabel user
    userListTbody?.addEventListener('click', async function(e) {
        const resetButton = e.target.closest('.btn-reset');
        if (resetButton) {
            const userId = resetButton.dataset.userid;
            const username = resetButton.dataset.username;
            if (confirm(`Yakin ingin mereset password untuk user ${username}?`)) {
                resetUserPassword(userId);
            }
        }
    });

    // --- Fungsi API Request ---
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

    async function deleteOrder(orderId) {
        await apiRequest(`/api/admin/delete-order/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        alert('Pesanan berhasil dihapus.');
        fetchAdminDashboardData(); // Refresh data
    }

    async function resetUserPassword(userId) {
        const result = await apiRequest('/api/admin/reset-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId })
        });
        alert(`${result.message}\nPassword Sementara: ${result.temporaryPassword}`);
    }

    // --- Inisialisasi Halaman ---
    fetchAdminDashboardData();
    showView('dashboard'); // Tampilkan dashboard sebagai default
});