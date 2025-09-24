document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        alert('Akses ditolak. Anda bukan admin atau sesi Anda telah berakhir.');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
        return;
    }
    
    const statsGrid = document.getElementById('stats-grid');
    const ordersTbody = document.getElementById('orders-tbody');
    const adminWelcome = document.getElementById('admin-welcome');
    const searchInput = document.getElementById('search-input');
    const logoutBtn = document.getElementById('admin-logout-btn');
    
    // Elemen baru untuk stok
    const currentStockEl = document.getElementById('current-stock');
    const stockChangeInput = document.getElementById('stock-change-value');
    const increaseBtn = document.getElementById('increase-stock-btn');
    const decreaseBtn = document.getElementById('decrease-stock-btn');

    let allOrders = [];

    if(adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }

    // --- FUNGSI BARU UNTUK STOK ---
    async function fetchChekiStock() {
        try {
            // NOTE: Di implementasi production, ini akan menjadi endpoint API
            // Untuk sekarang, kita fetch dari data.json
            const response = await fetch('../data.json'); 
            const data = await response.json();
            currentStockEl.textContent = data.cheki_stock;
        } catch (error) {
            currentStockEl.textContent = 'Gagal memuat';
            console.error('Error fetching stock:', error);
        }
    }

    // NOTE: Fungsi ini hanya simulasi karena kita tidak bisa menulis ke data.json dari client-side
    // Di aplikasi nyata, ini akan memanggil API backend
    async function updateChekiStock(change) {
        const currentValue = parseInt(currentStockEl.textContent);
        if (isNaN(currentValue)) {
            alert('Gagal mendapatkan nilai stok saat ini.');
            return;
        }
        
        const newValue = currentValue + change;
        if (newValue < 0) {
            alert('Stok tidak bisa kurang dari nol.');
            return;
        }

        alert(`(SIMULASI) Stok akan diubah menjadi ${newValue}.\nDi aplikasi production, ini akan mengirim permintaan ke server.`);
        
        // Simulasi update di UI
        currentStockEl.textContent = newValue;
        stockChangeInput.value = '';
        
        /*
        // KODE ASLI UNTUK PRODUCTION DENGAN BACKEND
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
            fetchChekiStock(); // Refresh stok dari server
            stockChangeInput.value = '';
        } catch (error) {
            alert('Gagal mengubah stok: ' + error.message);
        }
        */
    }

    increaseBtn.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) {
            updateChekiStock(value);
        } else {
            alert('Masukkan jumlah yang valid.');
        }
    });

    decreaseBtn.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) {
            updateChekiStock(-value);
        } else {
            alert('Masukkan jumlah yang valid.');
        }
    });

    async function fetchStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal memuat statistik. Sesi mungkin berakhir.');
            
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
            alert(error.message);
        }
    }

    async function fetchAllOrders() {
        try {
            const response = await fetch('/api/admin/all-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Gagal memuat pesanan. Sesi mungkin berakhir.');
            
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

                    alert(`${result.message}\n\nPassword Sementara: ${result.temporaryPassword}\n\nHarap segera berikan password ini kepada user dan minta mereka untuk menggantinya.`);
                } catch (error) {
                    alert('Gagal mereset password: ' + error.message);
                }
            }
        }
    });

    fetchStats();
    fetchAllOrders();
    fetchChekiStock();
});