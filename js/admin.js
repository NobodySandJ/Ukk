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
    const statsGrid = document.getElementById('stats-grid');
    const ordersTbody = document.getElementById('orders-tbody');
    const searchInput = document.getElementById('search-input');
    const currentStockEl = document.getElementById('current-stock');
    const stockChangeInput = document.getElementById('stock-change-value');
    const increaseBtn = document.getElementById('increase-stock-btn');
    const decreaseBtn = document.getElementById('decrease-stock-btn');

    let allOrders = []; // Cache untuk data pesanan

    // --- Inisialisasi ---
    if (adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    // --- Fungsi Fetch Data ---
    const fetchAdminData = async () => {
        try {
            const [statsRes, ordersRes, stockRes] = await Promise.all([
                fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/all-orders', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/products-and-stock', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!statsRes.ok || !ordersRes.ok || !stockRes.ok) throw new Error('Gagal memuat data admin.');

            const stats = await statsRes.json();
            allOrders = await ordersRes.json();
            const stockData = await stockRes.json();
            
            renderStats(stats);
            renderOrders(allOrders);
            currentStockEl.textContent = stockData.cheki_stock;
        } catch (error) {
            alert(error.message);
        }
    };

    // --- Fungsi Render Tampilan ---
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
    
    // PERBAIKAN: Logika render status dan tombol
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
            
            // Logika Status Baru
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

    // --- Fungsi Aksi (API Calls) ---
    async function apiRequest(url, options) {
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Operasi gagal.');
            return result;
        } catch (error) {
            alert('Terjadi kesalahan: ' + error.message);
            throw error; // Lempar error agar bisa ditangkap oleh pemanggil
        }
    }

    // PERBAIKAN: Fungsi untuk menggunakan tiket
    async function useTicket(orderId) {
        try {
            await apiRequest('/api/admin/update-ticket-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ order_id: orderId, new_status: 'sudah_dipakai' })
            });
            alert('Tiket berhasil digunakan.');
            fetchAdminData(); // Muat ulang data untuk refresh tampilan
        } catch (error) {
            // Error sudah ditangani di apiRequest
        }
    }

    // PERBAIKAN: Fungsi untuk update stok
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
        } catch (error) {
           // Error sudah ditangani di apiRequest
        }
    }

    // --- Event Listeners ---
    logoutBtn?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

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
        if (value > 0) updateChekiStock(value);
        else alert('Masukkan jumlah yang valid.');
    });

    decreaseBtn?.addEventListener('click', () => {
        const value = parseInt(stockChangeInput.value);
        if (value > 0) updateChekiStock(-value);
        else alert('Masukkan jumlah yang valid.');
    });

    // --- Inisialisasi Halaman ---
    fetchAdminData();
});