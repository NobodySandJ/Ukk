// ================================================================
// ADMIN PANEL LOGIC v2.0
// Modern UI, No Native Alerts, Full Responsiveness
// ================================================================

if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || '../../';
}
var basePath = window.basePath;

document.addEventListener('DOMContentLoaded', function () {
    // ============================================================
    // 1. AUTH & INIT
    // ============================================================
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')) : null;

    if (!token || !userData || userData.peran !== 'admin') {
        window.location.href = `${basePath}index.html`;
        return;
    }

    // Set Welcome
    document.getElementById('admin-welcome').textContent = userData.nama_pengguna || 'Admin';

    // ============================================================
    // 2. UI INTERACTIONS (Sidebar, Tabs, Modals)
    // ============================================================

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // Navigation / Views
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-view]');
    const views = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    function switchView(viewName) {
        // Update Nav
        navLinks.forEach(link => {
            if (link.dataset.view === viewName) link.classList.add('active');
            else link.classList.remove('active');
        });

        // Update View
        views.forEach(view => {
            if (view.id === `view-${viewName}`) view.classList.add('active');
            else view.classList.remove('active');
        });

        // Update Title
        const titles = {
            'dashboard': 'Dashboard',
            'members': 'Manajemen Member',
            'news': 'Berita & Pengumuman',
            'gallery': 'Galeri Foto',
            'users': 'Manajemen User'
        };
        pageTitle.textContent = titles[viewName] || 'Admin Panel';

        // Close sidebar on mobile
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');

        // Fetch Data
        if (viewName === 'dashboard') loadDashboard();
        else if (viewName === 'members') loadMembers();
        else if (viewName === 'news') loadNews();
        else if (viewName === 'gallery') loadGallery();
        else if (viewName === 'users') loadUsers();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
        });
    });

    // ============================================================
    // 3. MODAL SYSTEM (Custom)
    // ============================================================

    // Open/Close Helper
    window.openModal = function (id) {
        document.getElementById(id).classList.add('active');
    };

    window.closeModal = function (id) {
        document.getElementById(id).classList.remove('active');
    };

    // Global Close Button Handler
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // CONFIRM MODAL (Replaces Confirm())
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    let confirmCallback = null;

    window.showConfirm = function (message, callback) {
        confirmMessage.textContent = message;
        confirmCallback = callback;
        openModal('confirm-modal');
    };

    confirmOkBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeModal('confirm-modal');
        confirmCallback = null;
    });

    confirmCancelBtn.addEventListener('click', () => {
        closeModal('confirm-modal');
        confirmCallback = null;
    });

    // ============================================================
    // 4. DATA & API LOGIC
    // ============================================================

    // Helper API Request
    async function apiRequest(url, options = {}) {
        const token = localStorage.getItem('userToken');
        const defaultHeaders = {
            'Authorization': `Bearer ${token}`
        };
        if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        };

        try {
            const response = await fetch(url, config);
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) throw new Error(data.message || 'Request failed');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showToast(error.message, 'error');
            throw error;
        }
    }

    // --- DASHBOARD ---
    async function loadDashboard() {
        try {
            // Stats
            const d = await apiRequest('/api/admin/dashboard-stats');
            document.getElementById('stat-total-users').textContent = d.users;
            document.getElementById('stat-active-orders').textContent = d.active_orders;
            document.getElementById('stat-revenue').textContent = 'Rp ' + (d.revenue || 0).toLocaleString('id-ID');
            document.getElementById('current-stock').textContent = d.stock;

            // Recent Orders
            const orders = await apiRequest('/api/admin/all-orders');
            renderOrders(orders.slice(0, 10)); // Top 10 recent
        } catch (e) { /* handled by apiRequest */ }
    }

    function renderOrders(orders) {
        const tbody = document.getElementById('orders-tbody');
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td><strong>${o.id_pesanan}</strong></td>
                <td>
                    ${o.nama_pelanggan}<br>
                    <small style="color:#64748b">${o.nomor_whatsapp || '-'}</small>
                </td>
                <td>
                    ${(o.detail_item || []).map(i => `${i.quantity}x ${i.name}`).join('<br>')}
                </td>
                <td>
                    <span style="padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; background: ${o.status_tiket === 'berlaku' ? '#dcfce7' : '#f1f5f9'}; color: ${o.status_tiket === 'berlaku' ? '#16a34a' : '#64748b'};">
                        ${o.status_tiket.toUpperCase()}
                    </span>
                </td>
                <td>
                    ${o.status_tiket === 'berlaku' ?
                `<button class="btn btn-icon-only btn-danger btn-mark-used" data-id="${o.id_pesanan}" title="Tandai Terpakai"><i class="fas fa-check"></i></button>` :
                '-'
            }
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;">Belum ada pesanan</td></tr>';

        // Add Listeners
        document.querySelectorAll('.btn-mark-used').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm(`Tandai pesanan ${btn.dataset.id} sebagai SUDAH DIPAKAI?`, async () => {
                    await apiRequest('/api/admin/redeem-ticket', {
                        method: 'POST', body: JSON.stringify({ orderId: btn.dataset.id })
                    });
                    showToast('Status berhasil diupdate', 'success');
                    loadDashboard();
                });
            });
        });
    }

    // Stock
    document.getElementById('add-stock-btn')?.addEventListener('click', async () => {
        const amount = document.getElementById('stock-change-value').value;
        try {
            await apiRequest('/api/admin/update-stock', {
                method: 'POST',
                body: JSON.stringify({ change: parseInt(amount) })
            });
            showToast(`Stok ditambah ${amount}`, 'success');
            const d = await apiRequest('/api/admin/dashboard-stats');
            document.getElementById('current-stock').textContent = d.stock;
        } catch (e) { }
    });

    document.getElementById('search-input')?.addEventListener('input', async (e) => {
        // Simple client search for now or fetch
        // For simplicity: reload
        // In real app: filter array
    });

    // --- MEMBERS ---
    let allMembers = [];
    async function loadMembers() {
        const grid = document.getElementById('members-grid');
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center;">Loading...</div>';
        try {
            allMembers = await apiRequest('/api/admin/members'); // Assuming this endpoint exists or similar
            // If API not exact, use fallback
            // Wait, existing admin.js used /api/admin/members
            renderMembers(allMembers);
        } catch (e) {
            grid.innerHTML = 'Error loading members';
        }
    }

    function renderMembers(list) {
        const grid = document.getElementById('members-grid');
        grid.innerHTML = list.map(m => `
            <div class="card" style="margin:0; height:100%; display:flex; flex-direction:column;">
                <div style="display:flex; gap:1rem; align-items:center; margin-bottom:1rem;">
                    <img src="${m.image_url ? (m.image_url.startsWith('http') ? m.image_url : '../../' + m.image_url) : '../../img/member/placeholder.webp'}" style="width:60px; height:60px; border-radius:50%; object-fit:cover;">
                    <div>
                        <div class="card-title">${m.name}</div>
                        <small style="color:#64748b">${m.role || '-'}</small>
                    </div>
                </div>
                <div style="flex:1; font-size:0.9rem; color:#475569; margin-bottom:1rem;">
                    "${m.details?.jiko || '...'}"
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                    <button class="btn btn-outline btn-edit-member" data-id="${m.id}" data-json='${JSON.stringify(m).replace(/'/g, "&apos;")}'>Edit</button>
                    <button class="btn btn-danger btn-delete-member" data-id="${m.id}">Hapus</button>
                </div>
            </div>
         `).join('');

        // Edit
        document.querySelectorAll('.btn-edit-member').forEach(btn => {
            btn.addEventListener('click', () => {
                const data = JSON.parse(btn.dataset.json);
                document.getElementById('edit-member-id').value = data.id;
                document.getElementById('member-name').value = data.name;
                document.getElementById('member-role').value = data.role;
                document.getElementById('member-jiko').value = data.details?.jiko || '';
                document.getElementById('member-showroom').value = data.socials?.showroom || '';
                document.getElementById('member-modal-title').textContent = 'Edit Member';
                openModal('member-modal');
            });
        });

        // Delete
        document.querySelectorAll('.btn-delete-member').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm('Hapus member ini selamanya?', async () => {
                    await apiRequest(`/api/admin/members/${btn.dataset.id}`, { method: 'DELETE' });
                    showToast('Member dihapus', 'success');
                    loadMembers();
                });
            });
        });
    }

    // Add Member
    document.getElementById('add-member-btn').addEventListener('click', () => {
        document.getElementById('member-form').reset();
        document.getElementById('edit-member-id').value = '';
        document.getElementById('member-modal-title').textContent = 'Tambah Member Baru';
        openModal('member-modal');
    });

    document.getElementById('member-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-member-id').value;
        const name = document.getElementById('member-name').value;
        const role = document.getElementById('member-role').value;
        const jiko = document.getElementById('member-jiko').value;
        const showroom = document.getElementById('member-showroom').value;
        const imageFile = document.getElementById('member-image').files[0];

        // Construct FormData if image, else JSON
        // Backend handles both? Assuming FormData for image
        // If image present, must use FormData

        let bodyPayload;
        let isFormData = false;

        if (imageFile) {
            const formData = new FormData();
            if (id) formData.append('id', id);
            formData.append('name', name);
            formData.append('role', role);
            formData.append('jiko', jiko);
            formData.append('showroom', showroom);
            formData.append('image', imageFile);
            bodyPayload = formData;
            isFormData = true;
        } else {
            bodyPayload = JSON.stringify({
                id, name, role, details: { jiko }, socials: { showroom }
            });
        }

        try {
            await apiRequest(id ? `/api/admin/members/${id}` : '/api/admin/members', {
                method: id ? 'PUT' : 'POST',
                body: bodyPayload
            });
            showToast('Data member disimpan', 'success');
            closeModal('member-modal');
            loadMembers();
        } catch (err) { }
    });


    // --- NEWS ---
    async function loadNews() {
        // Implementation similar to members
        const list = await apiRequest('/api/admin/news');
        document.getElementById('news-list').innerHTML = list.map(n => `
             <div class="card" style="margin:0;">
                <div class="card-header" style="margin-bottom:0.5rem;">
                    <div class="card-title">${n.title}</div>
                    <small>${n.date}</small>
                </div>
                <div style="color:#475569; margin-bottom:1rem;">${n.content}</div>
                <div style="display:flex; justify-content:flex-end;">
                     <button class="btn btn-danger btn-delete-news" data-id="${n.id}">Hapus</button>
                </div>
             </div>
        `).join('');

        document.querySelectorAll('.btn-delete-news').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm('Hapus berita ini?', async () => {
                    await apiRequest(`/api/admin/news/${btn.dataset.id}`, { method: 'DELETE' });
                    loadNews();
                });
            });
        });
    }

    document.getElementById('add-news-btn').addEventListener('click', () => {
        document.getElementById('news-form').reset();
        openModal('news-modal');
    });

    document.getElementById('news-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('news-title').value;
        const content = document.getElementById('news-content').value;
        const date = document.getElementById('news-date').value;

        await apiRequest('/api/admin/news', {
            method: 'POST',
            body: JSON.stringify({ title, content, date })
        });
        showToast('Berita dipublish', 'success');
        closeModal('news-modal');
        loadNews();
    });

    // --- GALLERY ---
    async function loadGallery() {
        const grid = document.getElementById('gallery-grid');
        const list = await apiRequest('/api/admin/gallery');
        grid.innerHTML = list.map(g => `
            <div style="position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden;">
                <img src="${g.image_url ? (g.image_url.startsWith('http') ? g.image_url : '../../' + g.image_url) : ''}" style="width:100%; height:100%; object-fit:cover;">
                <button class="btn-icon-only btn-danger btn-delete-gallery" data-id="${g.id}" data-src="${g.image_url || ''}" style="position:absolute; bottom:5px; right:5px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        document.querySelectorAll('.btn-delete-gallery').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm('Hapus foto ini?', async () => {
                    await apiRequest(`/api/admin/gallery/${btn.dataset.id}`, { method: 'DELETE' });
                    showToast('Foto dihapus', 'success');
                    loadGallery();
                });
            });
        });
    }

    document.getElementById('add-gallery-btn').addEventListener('click', () => openModal('gallery-modal'));
    document.getElementById('gallery-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const img = document.getElementById('gallery-image').files[0];
        const alt = document.getElementById('gallery-alt').value;
        if (!img) return;

        const fd = new FormData();
        fd.append('image', img);
        fd.append('title', alt);

        await apiRequest('/api/admin/gallery', { method: 'POST', body: fd });
        showToast('Foto diupload (tersimpan ke server)', 'success');
        closeModal('gallery-modal');
        loadGallery();
    });


    // --- USERS ---
    async function loadUsers() {
        const list = await apiRequest('/api/admin/all-users');
        const tbody = document.getElementById('user-list-tbody');
        tbody.innerHTML = list.map(u => `
            <tr>
                <td>${u.nama_pengguna}</td>
                <td>${u.email}</td>
                <td>${u.nomor_whatsapp || '-'}</td>
                <td>
                    <button class="btn btn-outline btn-reset-code" data-id="${u.id}"><i class="fas fa-key"></i> Reset Password</button>
                </td>
            </tr>
        `).join('');

        // Listeners for User Actions
        document.querySelectorAll('.btn-reset-code').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm('Generate OTP reset password untuk user ini?', async () => {
                    const res = await apiRequest('/api/admin/generate-reset-code', { method: 'POST', body: JSON.stringify({ userId: btn.dataset.id }) });
                    // Show OTP Modal
                    document.getElementById('otp-code-display').textContent = res.code;
                    openModal('otp-modal');
                });
            });
        });


    }

    // OTP Modal Copy
    document.getElementById('copy-btn').addEventListener('click', () => {
        const code = document.getElementById('otp-code-display').textContent;
        navigator.clipboard.writeText(code);
        showToast('Kode disalin', 'success');
    });

    // LOGOUT
    document.getElementById('admin-logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        showConfirm('Logout dari Admin Panel?', () => {
            localStorage.clear();
            window.location.href = `${basePath}index.html`;
        });
    });

    // INIT
    switchView('dashboard');

});