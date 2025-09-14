document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    // Keamanan: Cek apakah pengguna adalah admin
    // Menggunakan kolom 'peran' sesuai dengan database Bahasa Indonesia
    if (!token || !userData || userData.peran !== 'admin') {
        alert('Akses ditolak. Anda bukan admin.');
        window.location.href = 'index.html';
        return;
    }
    
    const statsGrid = document.getElementById('stats-grid');
    const ordersTbody = document.getElementById('orders-tbody');
    const adminWelcome = document.getElementById('admin-welcome');

    // Menampilkan nama admin
    if(adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    // Mengambil dan menampilkan statistik
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

    // Mengambil dan menampilkan semua pesanan
    async function fetchAllOrders() {
        try {
            const response = await fetch('/api/admin/all-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal memuat pesanan.');
            
            const orders = await response.json();
            renderOrders(orders);
        } catch (error) {
            ordersTbody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
        }
    }

    // Merender tabel pesanan (sudah disesuaikan dengan kolom Bahasa Indonesia)
    function renderOrders(orders) {
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada pesanan.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            let items = order.detail_item ? order.detail_item.map(item => `${item.quantity}x ${item.name}`).join('<br>') : 'Tidak ada detail';
            
            // Mengubah status_tiket menjadi lebih user-friendly
            let statusClass = '';
            let statusText = '';
            switch(order.status_tiket) {
                case 'berlaku':
                    statusClass = 'status-berlaku';
                    statusText = 'Berlaku';
                    break;
                case 'hangus':
                    statusClass = 'status-hangus';
                    statusText = 'Hangus';
                    break;
                default:
                    statusClass = 'status-pending';
                    statusText = 'Pending';
            }

            row.innerHTML = `
                <td>${order.id_pesanan}</td>
                <td>${order.nama_pelanggan}<br><small>${order.email_pelanggan}</small></td>
                <td>${items}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><button class="action-btn btn-use" data-orderid="${order.id_pesanan}" ${order.status_tiket !== 'berlaku' ? 'disabled' : ''}>Gunakan</button></td>
            `;
            ordersTbody.appendChild(row);
        });
    }

    // Event listener untuk tombol "Gunakan" tiket
    ordersTbody.addEventListener('click', async function(e) {
        if (e.target && e.target.classList.contains('btn-use')) {
            const button = e.target;
            const orderId = button.dataset.orderid;
            
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
                    fetchAllOrders(); // Muat ulang data tabel untuk menampilkan perubahan
                } catch (error) {
                    alert('Terjadi kesalahan: ' + error.message);
                }
            }
        }
    });

    // Inisialisasi panel admin
    fetchStats();
    fetchAllOrders();
});