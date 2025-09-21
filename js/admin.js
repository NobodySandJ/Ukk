// nobodysandj/ukk/Ukk-7c6003e68c8bfcc1421a6e0fe28a09e9ec6fbf04/js/admin.js
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        alert('Akses ditolak. Anda bukan admin.');
        window.location.href = 'index.html';
        return;
    }
    
    const statsGrid = document.getElementById('stats-grid');
    const ordersTbody = document.getElementById('orders-tbody');
    const adminWelcome = document.getElementById('admin-welcome');
    const searchInput = document.getElementById('search-input');
    const logoutBtn = document.getElementById('admin-logout-btn');
    
    let allOrders = [];

    if(adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            alert('Anda telah logout.');
            window.location.href = 'index.html';
        });
    }

    async function fetchStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal memuat statistik.');
            
            const stats = await response.json();

            statsGrid.innerHTML = `
                <div class="stat-card"><h3>Total Pendapatan</h3><p>Rp ${stats.totalRevenue.toLocaleString('id-ID')}</p></div>
                <div class="stat-card"><h3>Total Cheki Terjual</h3><p>${stats.totalCheki}</p></div>
            `;
            const memberCard = document.createElement('div');
            memberCard.className = 'stat-card';
            memberCard.innerHTML = '<h3>Cheki per Member</h3>';
            let memberStatsHTML = '<ul style="text-align:left; font-size: 1rem; list-style-position: inside;">';
            for (const member in stats.chekiPerMember) {
                memberStatsHTML += `<li><strong>${member}:</strong> ${stats.chekiPerMember[member]} pcs</li>`;
            }
            memberStatsHTML += '</ul>';
            memberCard.innerHTML += memberStatsHTML;
            statsGrid.appendChild(memberCard);
        } catch (error) {
            statsGrid.innerHTML = `<p>${error.message}</p>`;
        }
    }

    async function fetchAllOrders() {
        try {
            const response = await fetch('/api/admin/all-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal memuat pesanan.');
            
            allOrders = await response.json();
            renderOrders(allOrders);
        } catch (error) {
            ordersTbody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
        }
    }
    
    function renderOrders(orders) {
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tidak ada pesanan yang cocok.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            let items = order.detail_item ? order.detail_item.map(item => `${item.quantity}x ${item.name}`).join('<br>') : 'Tidak ada detail';
            
            let statusClass = '', statusText = '';
            switch(order.status_tiket) {
                case 'berlaku': statusClass = 'status-berlaku'; statusText = 'Berlaku'; break;
                case 'hangus': statusClass = 'status-hangus'; statusText = 'Hangus'; break;
                default: statusClass = 'status-pending'; statusText = 'Pending';
            }

            // Tambahkan tombol Reset Pass dengan data-userid
            row.innerHTML = `
                <td>${order.id_pesanan}</td>
                <td>${order.nama_pelanggan}<br><small>${order.email_pelanggan}</small></td>
                <td>${items}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn btn-use" data-orderid="${order.id_pesanan}" ${order.status_tiket !== 'berlaku' ? 'disabled' : ''}>Gunakan</button>
                    <button class="action-btn btn-delete" data-orderid="${order.id_pesanan}">Hapus</button>
                    <button class="action-btn btn-reset" data-userid="${order.id_pengguna}" data-username="${order.nama_pelanggan}">Reset Pass</button>
                </td>
            `;
            ordersTbody.appendChild(row);
        });
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredOrders = allOrders.filter(order => 
            (order.nama_pelanggan && order.nama_pelanggan.toLowerCase().includes(searchTerm)) ||
            (order.id_pesanan && order.id_pesanan.toLowerCase().includes(searchTerm))
        );
        renderOrders(filteredOrders);
    });

    ordersTbody.addEventListener('click', async function(e) {
        const button = e.target;
        if (!button.classList.contains('action-btn')) return;
    
        const orderId = button.dataset.orderid;
    
        if (button.classList.contains('btn-use')) {
            if (confirm(`Anda yakin ingin MENGGUNAKAN tiket untuk pesanan ${orderId}? Aksi ini akan mengubah statusnya menjadi HANGUS.`)) {
                try {
                    const response = await fetch('/api/admin/update-ticket-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ order_id: orderId, new_status: 'hangus' })
                    });
                    if (!response.ok) throw new Error('Gagal memperbarui status tiket.');
                    
                    alert('Status tiket berhasil diubah menjadi hangus.');
                    fetchAllOrders(); 
                } catch (error) {
                    alert('Terjadi kesalahan: ' + error.message);
                }
            }
        }
    
        if (button.classList.contains('btn-delete')) {
            if (confirm(`APAKAH ANDA YAKIN ingin MENGHAPUS pesanan ${orderId} secara permanen? Aksi ini tidak dapat dibatalkan.`)) {
                try {
                    const response = await fetch(`/api/admin/delete-order/${orderId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || 'Gagal menghapus pesanan.');

                    alert(result.message);
                    fetchAllOrders();
                } catch (error) {
                    alert('Terjadi kesalahan: ' + error.message);
                }
            }
        }

        // Fungsi BARU untuk tombol Reset Password
        if (button.classList.contains('btn-reset')) {
            const userId = button.dataset.userid;
            const username = button.dataset.username;
            if (confirm(`Anda yakin ingin mereset password untuk user ${username}?`)) {
                try {
                    const response = await fetch('/api/admin/reset-user-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ userId: userId })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);

                    // Tampilkan password sementara kepada admin
                    alert(`${result.message}\n\nPassword Sementara: ${result.temporaryPassword}\n\nHarap segera berikan password ini kepada user dan minta mereka untuk menggantinya.`);
                } catch (error) {
                    alert('Gagal mereset password: ' + error.message);
                }
            }
        }
    });

    fetchStats();
    fetchAllOrders();
});