// ================================================================
// FILE: admin.js - Admin Panel Logic (Full Rewrite)
// ================================================================
// Handles: Navigation, Dashboard Stats, Members CRUD, News CRUD,
//          Gallery CRUD, Orders Management, User Management
// ================================================================

// Menggunakan window.basePath untuk menghindari konflik saat multiple script di-load
if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || '../../';
}
var basePath = window.basePath;

document.addEventListener('DOMContentLoaded', function () {
    // ============================================================
    // AUTH CHECK - Verify admin access
    // ============================================================
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!token || !userData || userData.peran !== 'admin') {
        showToast('Akses ditolak. Silakan login sebagai admin.', 'error');
        localStorage.clear();
        window.location.href = `${basePath}index.html`;
        return;
    }

    // ============================================================
    // DOM ELEMENTS
    // ============================================================
    // Hamburger & Sidebar
    const adminHamburger = document.getElementById('admin-hamburger');
    const sidebar = document.querySelector('.sidebar');

    // Toggle Sidebar
    if (adminHamburger && sidebar) {
        adminHamburger.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside (Mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) &&
                !adminHamburger.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    const adminWelcome = document.getElementById('admin-welcome');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-view]');
    const adminViews = document.querySelectorAll('.admin-view');

    // Dashboard elements
    const statsGrid = document.getElementById('stats-grid');
    const currentStockEl = document.getElementById('current-stock');
    const stockChangeInput = document.getElementById('stock-change-value');
    const increaseBtn = document.getElementById('increase-stock-btn');
    const decreaseBtn = document.getElementById('decrease-stock-btn');

    // Members elements
    const membersGrid = document.getElementById('members-grid');
    const addMemberBtn = document.getElementById('add-member-btn');
    const memberModal = document.getElementById('member-modal');
    const memberForm = document.getElementById('member-form');
    const memberModalTitle = document.getElementById('member-modal-title');

    // News elements
    const newsList = document.getElementById('news-list');
    const addNewsBtn = document.getElementById('add-news-btn');
    const newsModal = document.getElementById('news-modal');
    const newsForm = document.getElementById('news-form');
    const newsModalTitle = document.getElementById('news-modal-title');

    // Gallery elements
    const galleryGrid = document.getElementById('gallery-grid');
    const addGalleryBtn = document.getElementById('add-gallery-btn');
    const galleryModal = document.getElementById('gallery-modal');
    const galleryForm = document.getElementById('gallery-form');

    // Orders elements
    const ordersTbody = document.getElementById('orders-tbody');
    const searchInput = document.getElementById('search-input');

    // Users elements
    const userListTbody = document.getElementById('user-list-tbody');
    const userSearchInput = document.getElementById('user-search-input');

    // Data storage
    let allOrders = [];
    let allUsers = [];
    let allMembers = [];
    let allNews = [];
    let allGallery = [];
    let salesChart = null;

    // Set admin welcome message
    if (adminWelcome && userData.nama_pengguna) {
        adminWelcome.textContent = `Selamat Datang, ${userData.nama_pengguna}!`;
    }

    // ============================================================
    // NAVIGATION SYSTEM
    // ============================================================
    function switchView(viewName) {
        adminViews.forEach(view => view.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));

        const targetView = document.getElementById(`view-${viewName}`);
        const targetLink = document.querySelector(`.nav-link[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetLink) targetLink.classList.add('active');

        // Load data for specific views
        if (viewName === 'dashboard') fetchDashboardData();
        else if (viewName === 'members') fetchMembers();
        else if (viewName === 'news') fetchNews();
        else if (viewName === 'verification') {
            // Reset verification view
            const resDiv = document.getElementById('verification-result');
            const manInp = document.getElementById('manual-order-id');
            if (resDiv) resDiv.style.display = 'none';
            if (manInp) manInp.value = '';
        }
        else if (viewName === 'gallery') fetchGallery();
        else if (viewName === 'orders') fetchOrders();
        else if (viewName === 'users') fetchUsers();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = link.dataset.view;
            if (viewName) switchView(viewName);
        });
    });

    // ============================================================
    // API HELPER
    // ============================================================
    async function apiRequest(url, options = {}) {
        try {
            const defaultHeaders = { 'Authorization': `Bearer ${token}` };
            if (!(options.body instanceof FormData)) {
                defaultHeaders['Content-Type'] = 'application/json';
            }
            options.headers = { ...defaultHeaders, ...options.headers };

            const response = await fetch(url, options);
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Request failed');
            return result;
        } catch (error) {
            showToast(error.message, 'error');
            throw error;
        }
    }

    // ============================================================
    // MODAL SYSTEM
    // ============================================================
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    // Close modal buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // Close modal on backdrop click
    document.querySelectorAll('.admin-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // ============================================================
    // DASHBOARD
    // ============================================================
    async function fetchDashboardData() {
        showDashboardSkeleton();
        try {
            const [stats, stockData] = await Promise.all([
                apiRequest('/api/admin/stats'),
                fetch('/api/products-and-stock').then(r => r.json())
            ]);

            renderStats(stats);
            renderCharts(stats);
            if (currentStockEl) currentStockEl.textContent = stockData.cheki_stock || 0;
        } catch (error) {
            console.error('Dashboard error:', error);
        }
    }

    function showDashboardSkeleton() {
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="skeleton skeleton-stat-card"></div>
                <div class="skeleton skeleton-stat-card"></div>
                <div class="skeleton skeleton-stat-card"></div>
            `;
        }
    }

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

    function renderCharts(stats) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;
        if (salesChart) salesChart.destroy();

        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.chekiPerMember),
                datasets: [{
                    label: 'Tiket Terjual',
                    data: Object.values(stats.chekiPerMember),
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    // Stock management
    increaseBtn?.addEventListener('click', async () => {
        const val = parseInt(stockChangeInput.value);
        if (val > 0) {
            await apiRequest('/api/admin/update-cheki-stock', {
                method: 'POST',
                body: JSON.stringify({ changeValue: val })
            });
            showToast('Stok berhasil ditambah!', 'success');
            stockChangeInput.value = '';
            fetchDashboardData();
        }
    });

    decreaseBtn?.addEventListener('click', async () => {
        const val = parseInt(stockChangeInput.value);
        if (val > 0) {
            await apiRequest('/api/admin/update-cheki-stock', {
                method: 'POST',
                body: JSON.stringify({ changeValue: -val })
            });
            showToast('Stok berhasil dikurangi!', 'success');
            stockChangeInput.value = '';
            fetchDashboardData();
        }
    });

    // ============================================================
    // MEMBERS CRUD
    // ============================================================
    async function fetchMembers() {
        if (!membersGrid) return;
        membersGrid.innerHTML = '<div class="skeleton skeleton-member-card"></div><div class="skeleton skeleton-member-card"></div>';

        try {
            allMembers = await apiRequest('/api/admin/members');
            renderMembers(allMembers);
        } catch (error) {
            membersGrid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Gagal memuat data member</p></div>';
        }
    }

    function renderMembers(members) {
        if (!membersGrid) return;
        if (members.length === 0) {
            membersGrid.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Belum ada member. Klik "Tambah Member" untuk menambahkan.</p></div>';
            return;
        }

        membersGrid.innerHTML = members.map(m => `
            <div class="member-card" data-id="${m.id}">
                <img class="member-card-image" src="${m.image_url || `${basePath}img/placeholder.png`}" alt="${m.name}" onerror="this.src='${basePath}img/placeholder.png'">
                <div class="member-card-body">
                    <h4>${m.name}</h4>
                    <p>${m.role || 'Member'}</p>
                    <p class="price">Rp ${(m.price || 25000).toLocaleString('id-ID')}</p>
                    <div class="member-card-actions">
                        <button class="action-btn btn-edit" data-id="${m.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="action-btn btn-danger btn-delete" data-id="${m.id}"><i class="fas fa-trash"></i> Hapus</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    addMemberBtn?.addEventListener('click', () => {
        memberModalTitle.textContent = 'Tambah Member Baru';
        memberForm.reset();
        document.getElementById('member-id').value = '';
        document.getElementById('image-preview').classList.remove('active');
        document.getElementById('image-preview').innerHTML = '';
        openModal('member-modal');
    });

    // Image preview for member form
    document.getElementById('member-image')?.addEventListener('change', function (e) {
        const preview = document.getElementById('image-preview');
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.classList.add('active');
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    memberForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const memberId = document.getElementById('member-id').value;
        const formData = new FormData();

        formData.append('name', document.getElementById('member-name').value);
        formData.append('role', document.getElementById('member-role').value);
        formData.append('price', document.getElementById('member-price').value);
        formData.append('sifat', document.getElementById('member-sifat').value);
        formData.append('hobi', document.getElementById('member-hobi').value);
        formData.append('jiko', document.getElementById('member-jiko').value);
        formData.append('display_order', document.getElementById('member-order').value);

        const imageFile = document.getElementById('member-image').files[0];
        if (imageFile) formData.append('image', imageFile);

        try {
            let response;
            if (memberId) {
                response = await fetch(`/api/admin/members/${memberId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            } else {
                response = await fetch('/api/admin/members', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Gagal menyimpan member');
            }

            showToast(memberId ? 'Member berhasil diupdate!' : 'Member berhasil ditambahkan!', 'success');
            closeModal('member-modal');
            fetchMembers();
        } catch (error) {
            showToast(error.message || 'Gagal menyimpan member', 'error');
        }
    });

    // Member edit/delete delegation
    membersGrid?.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (editBtn) {
            const memberId = editBtn.dataset.id;
            const member = allMembers.find(m => m.id === memberId);
            if (member) {
                memberModalTitle.textContent = 'Edit Member';
                document.getElementById('member-id').value = member.id;
                document.getElementById('member-name').value = member.name || '';
                document.getElementById('member-role').value = member.role || '';
                document.getElementById('member-price').value = member.price || 25000;
                document.getElementById('member-sifat').value = member.details?.sifat || '';
                document.getElementById('member-hobi').value = member.details?.hobi || '';
                document.getElementById('member-jiko').value = member.details?.jiko || '';
                document.getElementById('member-order').value = member.display_order || 0;

                const preview = document.getElementById('image-preview');
                if (member.image_url) {
                    preview.innerHTML = `<img src="${member.image_url}" alt="Preview">`;
                    preview.classList.add('active');
                } else {
                    preview.classList.remove('active');
                    preview.innerHTML = '';
                }
                openModal('member-modal');
            }
        }

        if (deleteBtn) {
            if (confirm('Yakin ingin menghapus member ini?')) {
                try {
                    await apiRequest(`/api/admin/members/${deleteBtn.dataset.id}`, { method: 'DELETE' });
                    showToast('Member berhasil dihapus!', 'success');
                    fetchMembers();
                } catch (error) { /* handled */ }
            }
        }
    });

    // ============================================================
    // NEWS CRUD
    // ============================================================
    async function fetchNews() {
        if (!newsList) return;
        newsList.innerHTML = '<div class="skeleton skeleton-news-item"></div><div class="skeleton skeleton-news-item"></div>';

        try {
            allNews = await apiRequest('/api/admin/news');
            renderNews(allNews);
        } catch (error) {
            newsList.innerHTML = '<div class="empty-state"><i class="fas fa-newspaper"></i><p>Gagal memuat berita</p></div>';
        }
    }

    function renderNews(news) {
        if (!newsList) return;
        if (news.length === 0) {
            newsList.innerHTML = '<div class="empty-state"><i class="fas fa-newspaper"></i><p>Belum ada berita.</p></div>';
            return;
        }

        newsList.innerHTML = news.map(n => `
            <div class="news-item" data-id="${n.id}">
                <div class="news-item-content">
                    <h4>${n.title}</h4>
                    <p>${n.date || ''} ${n.content ? '- ' + n.content.substring(0, 50) + '...' : ''}</p>
                </div>
                <div class="news-item-actions">
                    <button class="action-btn btn-edit" data-id="${n.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn btn-danger btn-delete" data-id="${n.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    addNewsBtn?.addEventListener('click', () => {
        newsModalTitle.textContent = 'Tambah Berita Baru';
        newsForm.reset();
        document.getElementById('news-id').value = '';
        openModal('news-modal');
    });

    newsForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newsId = document.getElementById('news-id').value;
        const data = {
            title: document.getElementById('news-title').value,
            date: document.getElementById('news-date').value,
            content: document.getElementById('news-content').value
        };

        try {
            if (newsId) {
                await apiRequest(`/api/admin/news/${newsId}`, { method: 'PUT', body: JSON.stringify(data) });
            } else {
                await apiRequest('/api/admin/news', { method: 'POST', body: JSON.stringify(data) });
            }
            showToast('Berita berhasil disimpan!', 'success');
            closeModal('news-modal');
            fetchNews();
        } catch (error) { /* handled */ }
    });

    newsList?.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (editBtn) {
            const news = allNews.find(n => n.id === editBtn.dataset.id);
            if (news) {
                newsModalTitle.textContent = 'Edit Berita';
                document.getElementById('news-id').value = news.id;
                document.getElementById('news-title').value = news.title || '';
                document.getElementById('news-date').value = news.date || '';
                document.getElementById('news-content').value = news.content || '';
                openModal('news-modal');
            }
        }

        if (deleteBtn) {
            if (confirm('Yakin ingin menghapus berita ini?')) {
                await apiRequest(`/api/admin/news/${deleteBtn.dataset.id}`, { method: 'DELETE' });
                showToast('Berita berhasil dihapus!', 'success');
                fetchNews();
            }
        }
    });

    // ============================================================
    // GALLERY CRUD
    // ============================================================
    async function fetchGallery() {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '<div class="skeleton skeleton-gallery-item"></div><div class="skeleton skeleton-gallery-item"></div><div class="skeleton skeleton-gallery-item"></div>';

        try {
            allGallery = await apiRequest('/api/public/gallery');
            renderGallery(allGallery);
        } catch (error) {
            galleryGrid.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>Gagal memuat galeri</p></div>';
        }
    }

    function renderGallery(gallery) {
        if (!galleryGrid) return;
        if (gallery.length === 0) {
            galleryGrid.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>Belum ada foto di galeri.</p></div>';
            return;
        }

        galleryGrid.innerHTML = gallery.map(g => `
            <div class="gallery-item" data-id="${g.id}">
                <img src="${g.image_url}" alt="${g.alt_text || 'Gallery image'}">
                <div class="gallery-item-overlay">
                    <button class="btn-delete" data-id="${g.id}"><i class="fas fa-trash"></i> Hapus</button>
                </div>
            </div>
        `).join('');
    }

    addGalleryBtn?.addEventListener('click', () => {
        galleryForm.reset();
        document.getElementById('gallery-image-preview').classList.remove('active');
        document.getElementById('gallery-image-preview').innerHTML = '';
        openModal('gallery-modal');
    });

    document.getElementById('gallery-image')?.addEventListener('change', function () {
        const preview = document.getElementById('gallery-image-preview');
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.classList.add('active');
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    galleryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const imageFile = document.getElementById('gallery-image').files[0];
        if (!imageFile) {
            showToast('Pilih file gambar terlebih dahulu', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('alt_text', document.getElementById('gallery-alt').value);
        formData.append('display_order', document.getElementById('gallery-order').value);

        try {
            const response = await fetch('/api/admin/gallery', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Upload gagal');
            }

            showToast('Foto berhasil diupload!', 'success');
            closeModal('gallery-modal');
            fetchGallery();
        } catch (error) {
            showToast(error.message || 'Gagal upload foto', 'error');
        }
    });

    galleryGrid?.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            if (confirm('Yakin ingin menghapus foto ini?')) {
                await apiRequest(`/api/admin/gallery/${deleteBtn.dataset.id}`, { method: 'DELETE' });
                showToast('Foto berhasil dihapus!', 'success');
                fetchGallery();
            }
        }
    });

    // ============================================================
    // ORDERS MANAGEMENT
    // ============================================================
    async function fetchOrders() {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '<tr><td colspan="6"><div class="skeleton skeleton-table-row"></div></td></tr>';

        try {
            allOrders = await apiRequest('/api/admin/all-orders');
            renderOrders(allOrders);
        } catch (error) {
            ordersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Gagal memuat pesanan</td></tr>';
        }
    }

    function renderOrders(orders) {
        if (!ordersTbody) return;
        if (orders.length === 0) {
            ordersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada tiket</td></tr>';
            return;
        }

        const UNDO_DURATION = 15 * 60 * 1000;
        ordersTbody.innerHTML = orders.map(order => {
            const items = order.detail_item?.map(i => `${i.quantity}x ${i.name.replace('Cheki ', '')}`).join(', ') || 'N/A';
            const createdAt = order.dibuat_pada ? new Date(order.dibuat_pada).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-';
            const isUsed = order.status_tiket === 'sudah_dipakai';
            const statusClass = isUsed ? 'status-hangus' : 'status-berlaku';
            const statusText = isUsed ? 'Sudah Dipakai' : 'Berlaku';

            const undoData = getUndoData(order.id_pesanan);
            const canUndo = isUsed && undoData && (Date.now() - undoData.timestamp < UNDO_DURATION);

            let actionButton = '';
            if (!isUsed) {
                actionButton = `<button class="action-btn btn-success btn-use" data-orderid="${order.id_pesanan}"><i class="fas fa-check"></i> Gunakan</button>`;
            } else if (canUndo) {
                actionButton = `<button class="action-btn btn-undo" data-orderid="${order.id_pesanan}"><i class="fas fa-undo"></i> Undo</button>`;
            } else {
                actionButton = `<button class="action-btn" disabled style="opacity:0.5;cursor:not-allowed;"><i class="fas fa-ban"></i> Tidak bisa undo</button>`;
            }

            return `
                <tr>
                    <td data-label="ID Pesanan"><small>${order.id_pesanan}</small></td>
                    <td data-label="Pelanggan">${order.nama_pelanggan}</td>
                    <td data-label="Detail Item">${items}</td>
                    <td data-label="Dibuat Pada"><small>${createdAt}</small></td>
                    <td data-label="Status"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td data-label="Aksi">${actionButton}</td>
                </tr>
            `;
        }).join('');
    }

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

    ordersTbody?.addEventListener('click', async (e) => {
        const useBtn = e.target.closest('.btn-use');
        const undoBtn = e.target.closest('.btn-undo');

        if (useBtn) {
            if (confirm('Yakin ingin menggunakan tiket ini?')) {
                await apiRequest('/api/admin/update-ticket-status', {
                    method: 'POST',
                    body: JSON.stringify({ order_id: useBtn.dataset.orderid, new_status: 'sudah_dipakai' })
                });
                saveUndoData(useBtn.dataset.orderid);
                showToast('Tiket berhasil digunakan!', 'success');
                fetchOrders();
            }
        }

        if (undoBtn) {
            await apiRequest('/api/admin/update-ticket-status', {
                method: 'POST',
                body: JSON.stringify({ order_id: undoBtn.dataset.orderid, new_status: 'berlaku' })
            });
            removeUndoData(undoBtn.dataset.orderid);
            showToast('Tiket berhasil di-undo!', 'success');
            fetchOrders();
        }
    });

    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allOrders.filter(o =>
            o.nama_pelanggan.toLowerCase().includes(term) ||
            o.id_pesanan.toLowerCase().includes(term)
        );
        renderOrders(filtered);
    });

    // ============================================================
    // USERS MANAGEMENT
    // ============================================================
    async function fetchUsers() {
        if (!userListTbody) return;
        userListTbody.innerHTML = '<tr><td colspan="4"><div class="skeleton skeleton-table-row"></div></td></tr>';

        try {
            allUsers = await apiRequest('/api/admin/all-users');
            renderUsers(allUsers);
        } catch (error) {
            userListTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Gagal memuat user</td></tr>';
        }
    }

    function renderUsers(users) {
        if (!userListTbody) return;
        if (users.length === 0) {
            userListTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada user</td></tr>';
            return;
        }

        userListTbody.innerHTML = users.map(u => `
            <tr>
                <td data-label="Username">${u.nama_pengguna}</td>
                <td data-label="Email">${u.email}</td>
                <td data-label="No. WhatsApp">${u.nomor_whatsapp || '-'}</td>
                <td data-label="Aksi">
                    <button class="action-btn btn-reset btn-generate-code" data-userid="${u.id}" data-username="${u.nama_pengguna}" title="Generate Kode OTP">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="action-btn btn-delete btn-force-reset" data-userid="${u.id}" data-username="${u.nama_pengguna}" title="Reset ke 123456" style="margin-left:5px;">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // OTP Modal Logic
    const otpModal = document.getElementById('otp-modal');
    const otpCodeDisplay = document.getElementById('otp-code-display');
    const otpExpiry = document.getElementById('otp-expiry');
    const otpCopyBtn = document.getElementById('copy-btn');
    const otpCloseBtn = document.getElementById('close-modal-btn');

    if (otpCloseBtn) otpCloseBtn.onclick = () => otpModal.classList.remove('active');
    if (otpModal) otpModal.onclick = (e) => { if (e.target === otpModal) otpModal.classList.remove('active'); };

    if (otpCopyBtn) {
        otpCopyBtn.onclick = () => {
            const code = otpCodeDisplay.textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('Kode berhasil disalin!', 'success');
                otpCopyBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
                otpCopyBtn.classList.add('copied');
                setTimeout(() => {
                    otpCopyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin Kode OTP';
                    otpCopyBtn.classList.remove('copied');
                }, 2000);
            });
        };
    }

    function showCodeModal(code, expiry) {
        if (!otpModal) return alert("Kode: " + code);
        otpCodeDisplay.textContent = code;
        otpExpiry.textContent = 'Berlaku ' + expiry;
        otpModal.classList.add('active');
        otpCopyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin Kode OTP';
        otpCopyBtn.classList.remove('copied');
    }

    userListTbody?.addEventListener('click', async (e) => {
        const genBtn = e.target.closest('.btn-generate-code');
        if (genBtn) {
            if (confirm(`Generate kode reset untuk ${genBtn.dataset.username}?`)) {
                try {
                    const result = await apiRequest('/api/admin/generate-reset-code', {
                        method: 'POST',
                        body: JSON.stringify({ userId: genBtn.dataset.userid })
                    });
                    showCodeModal(result.code, result.expiresIn);
                } catch (error) { /* handled */ }
            }
        }

        const resetBtn = e.target.closest('.btn-force-reset');
        if (resetBtn) {
            if (confirm(`Yakin FORCE RESET password user ${resetBtn.dataset.username} menjadi "123456"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
                try {
                    const result = await apiRequest('/api/admin/reset-user-password', {
                        method: 'POST',
                        body: JSON.stringify({ userId: resetBtn.dataset.userid })
                    });
                    alert(result.message);
                } catch (error) {
                    alert('Gagal reset password: ' + error.message);
                }
            }
        }
    });

    userSearchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => u.nama_pengguna.toLowerCase().includes(term));
        renderUsers(filtered);
    });

    // ============================================================
    // VERIFICATION LOGIC
    // ============================================================
    const manualVerifyBtn = document.getElementById('manual-verify-btn');
    const manualInput = document.getElementById('manual-order-id');
    const resultDiv = document.getElementById('verification-result');
    const startScanBtn = document.getElementById('start-scan-btn');

    if (manualVerifyBtn) {
        manualVerifyBtn.addEventListener('click', async () => {
            const orderId = manualInput.value.trim();
            if (!orderId) return showToast('Masukkan ID Pesanan', 'warning');

            try {
                // Use existing apiRequest helper
                const result = await apiRequest('/api/admin/redeem-ticket', {
                    method: 'POST',
                    body: JSON.stringify({ orderId })
                });

                resultDiv.style.display = 'block';
                // Success logic
                resultDiv.innerHTML = `
                    <div style="padding:1.5rem; background:#dcfce7; border:1px solid #22c55e; border-radius:12px; text-align:center;">
                        <i class="fas fa-check-circle" style="font-size:3rem; color:#16a34a; margin-bottom:1rem;"></i>
                        <h3 style="color:#15803d; margin:0;">VERIFIKASI SUKSES</h3>
                        <p style="font-size:1.1rem; color:#166534; margin:1rem 0;">${result.message}</p>
                    </div>
                `;
                showToast('Tiket Valid & Terpakai', 'success');

            } catch (error) {
                // Error logic
                console.error("Verification failed:", error);
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div style="padding:1.5rem; background:#fee2e2; border:1px solid #ef4444; border-radius:12px; text-align:center;">
                        <i class="fas fa-times-circle" style="font-size:3rem; color:#dc2626; margin-bottom:1rem;"></i>
                        <h3 style="color:#b91c1c; margin:0;">VERIFIKASI GAGAL</h3>
                        <p style="font-size:1.1rem; color:#991b1b; margin:1rem 0;">${error.message || 'Tiket tidak ditemukan atau error server.'}</p>
                    </div>
                `;
            }
        });
    }

    if (startScanBtn) {
        startScanBtn.addEventListener('click', () => {
            // Buka scanner
            window.location.href = 'scanner.html';
        });
    }

    // ============================================================
    // LOGOUT
    // ============================================================
    logoutBtn?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = `${basePath}index.html`;
    });

    // ============================================================
    // INITIALIZE
    // ============================================================
    switchView('dashboard');
});