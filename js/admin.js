document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        alert('Akses ditolak. Anda bukan admin atau sesi Anda telah berakhir.');
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }
    
    const statsGrid = document.getElementById('stats-grid');
    const ordersTbody = document.getElementById('orders-tbody');
    const adminWelcome = document.getElementById('admin-welcome');
    const searchInput = document.getElementById('search-input');
    const logoutBtn = document.getElementById('admin-logout-btn');
    
    const currentStockEl = document.getElementById('current-stock');
    const stockChangeInput = document.getElementById('stock-change-value');
    const increaseBtn = document.getElementById('increase-stock-btn');
    const decreaseBtn = document.getElementById('decrease-stock-btn');

    let allOrders = [];

    if(adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    logoutBtn?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    async function fetchChekiStock() {
        try {
            const response = await fetch('/api/products-and-stock'); 
            const data = await response.json();
            currentStockEl.textContent = data.cheki_stock;
        } catch (error) {
            currentStockEl.textContent = 'Gagal memuat';
            console.error('Error fetching stock:', error);
        }
    }

    async function updateChekiStock(change) {
        try {
            const response = await fetch('/api/admin/update-cheki-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ changeValue: change })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            currentStockEl.textContent = result.newStock;
            stockChangeInput.value = '';

        } catch (error) {
            alert('Gagal mengubah stok: ' + error.message);
        }
    }

    increaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(value);
        else alert('Masukkan jumlah yang valid.');
    });

    decreaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(-value);
        else alert('Masukkan jumlah yang valid.');
    });

    async function fetchAdminData() {
        try {
            const [statsRes, ordersRes] = await Promise.all([
                fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/all-orders', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!statsRes.ok || !ordersRes.ok) throw new Error('Gagal memuat data admin. Sesi mungkin berakhir.');

            const stats = await statsRes.json();
            allOrders = await ordersRes.json();
            
            renderStats(stats);
            renderOrders(allOrders);
        } catch (error) {
            alert(error.message);
        }
    }
    
    function renderStats(stats) {
        statsGrid.innerHTML = `
            <div class="stat-card"><h3>Total Pendapatan</h3><p>Rp ${stats.totalRevenue.toLocaleString('id-ID')}</p></div>
            <div class="stat-card"><h3>Total Cheki Terjual</h3><p>${stats.totalCheki}</p></div>
        `;
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
                <td data-label="Aksi">
                    <div class="actions-container">
                        <button class="action-btn btn-use" data-orderid="${order.id_pesanan}" ${order.status_tiket !== 'berlaku' ? 'disabled' : ''}>Gunakan</button>
                        <button class="action-btn btn-delete" data-orderid="${order.id_pesanan}">Hapus</button>
                        <button class="action-btn btn-reset" data-userid="${order.id_pengguna}" data-username="${order.nama_pelanggan}">Reset Pass</button>
                    </div>
                </td>
            `;
            ordersTbody.appendChild(row);
        });
    }

    searchInput?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredOrders = allOrders.filter(order => 
            order.nama_pelanggan?.toLowerCase().includes(searchTerm) ||
            order.id_pesanan?.toLowerCase().includes(searchTerm)
        );
        renderOrders(filteredOrders);
    });

    ordersTbody?.addEventListener('click', async function(e) {
        const button = e.target.closest('.action-btn');
        if (!button) return;
    
        const orderId = button.dataset.orderid;
        const userId = button.dataset.userid;
        const username = button.dataset.username;

        if (button.classList.contains('btn-use')) {
            if (confirm(`Yakin ingin MENGGUNAKAN tiket untuk pesanan ${orderId}?`)) {
                updateTicketStatus(orderId, 'hangus');
            }
        } else if (button.classList.contains('btn-delete')) {
            if (confirm(`YAKIN ingin MENGHAPUS pesanan ${orderId} secara permanen?`)) {
                deleteOrder(orderId);
            }
        } else if (button.classList.contains('btn-reset')) {
            if (confirm(`Yakin ingin mereset password untuk user ${username}?`)) {
                resetUserPassword(userId);
            }
        }
    });

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

    async function updateTicketStatus(orderId, newStatus) {
        await apiRequest('/api/admin/update-ticket-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ order_id: orderId, new_status: newStatus })
        });
        alert('Status tiket berhasil diubah.');
        fetchAdminData();
    }

    async function deleteOrder(orderId) {
        const result = await apiRequest(`/api/admin/delete-order/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        alert(result.message);
        fetchAdminData();
    }

    async function resetUserPassword(userId) {
        const result = await apiRequest('/api/admin/reset-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId })
        });
        alert(`${result.message}\nPassword Sementara: ${result.temporaryPassword}`);
    }

    fetchAdminData();
    fetchChekiStock();
});