// ================================================================
// LOGIKA PANEL ADMIN Versi 2.0
// Antarmuka Modern, Tanpa Alert Bawaan, Responsif Penuh
// ================================================================

// Menggunakan basePath global dari script.js
var basePath = window.basePath || '../../';

document.addEventListener('DOMContentLoaded', function () {
    // ============================================================
    // 1. OTENTIKASI & INISIALISASI
    // ============================================================
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')) : null;

    // Validasi token
    if (!token || !userData || userData.peran !== 'admin') {
        if (typeof showToast === 'function') {
            showToast('Akses ditolak. Hanya admin yang bisa mengakses halaman ini.', 'error');
        }
        setTimeout(() => {
            window.location.href = `${basePath}index.html`;
        }, 1500);
        return;
    }
    
    // Check if token is expired (optional - for better UX)
    if (typeof isTokenValid === 'function' && !isTokenValid(token)) {
        if (typeof showToast === 'function') {
            showToast('Token Anda telah expired. Silakan login kembali.', 'error');
        }
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        setTimeout(() => {
            window.location.href = `${basePath}index.html`;
        }, 2000);
        return;
    }

    // Mengatur pesan selamat datang
    document.getElementById('admin-welcome').textContent = userData.nama_pengguna || 'Admin';

    // ============================================================
    // 2. INTERAKSI ANTARMUKA (Bilah Sisi, Tab, Modal)
    // ============================================================

    // Sidebar Toggle (Alih Bilah Sisi)
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // Navigasi / Tampilan (Views)
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-view]');
    const views = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    function switchView(viewName) {
        // Perbarui Navigasi
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
            'event': 'Pengaturan Event',
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
        else if (viewName === 'event') loadSettings();
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
    async function apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('userToken');
        const headers = { ...options.headers };

        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Auto-set Content-Type to JSON only if NOT FormData
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers
        };

        // Determine API Base URL
        // In production (Vercel), use same origin. In development, use localhost:3000
        const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000'
            : ''; // Use relative path for production (same origin)

        // Ensure endpoint starts with / if not present
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${apiBase}${cleanEndpoint}`;

        try {
            const response = await fetch(url, config);
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                let errorMessage = 'Request failed';
                if (typeof data === 'object') {
                    errorMessage = data.message || errorMessage;
                    if (data.error) errorMessage += ` (${data.error})`;
                } else {
                    errorMessage = data || errorMessage;
                }

                // Handle authentication errors
                if (response.status === 401 || response.status === 403) {
                    showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userData');
                    setTimeout(() => {
                        window.location.href = `${basePath}index.html`;
                    }, 2000);
                    return;
                }
                throw new Error(errorMessage);
            } return data;
        } catch (error) {
            console.error('API Error:', error);
            showToast(error.message, 'error');
            throw error;
        }
    }

    // --- DASHBOARD ---
    let dashboardChart = null;

    async function loadDashboard() {
        try {
            // Stats
            const d = await apiRequest('/api/admin/dashboard-stats');
            document.getElementById('stat-total-users').textContent = d.users;
            document.getElementById('stat-active-orders').textContent = d.active_orders;
            document.getElementById('stat-revenue').textContent = 'Rp ' + (d.revenue || 0).toLocaleString('id-ID');

            // Monthly Stats
            try {
                const monthly = await apiRequest('/api/admin/monthly-stats');
                const monthlyEl = document.getElementById('stat-monthly-revenue');
                const diffEl = document.getElementById('stat-revenue-diff');
                if (monthlyEl) monthlyEl.textContent = 'Rp ' + (monthly.revenue || 0).toLocaleString('id-ID');
                if (diffEl) {
                    const diff = monthly.percentChange || 0;
                    diffEl.textContent = (diff >= 0 ? '+' : '') + diff + '%';
                    diffEl.style.color = diff >= 0 ? '#10b981' : '#ef4444';
                }
            } catch (e) { console.warn('Monthly stats not available'); }

            // Chart Data
            const stats = await apiRequest('/api/admin/stats');
            initDashboardChart(stats.chekiPerMember || {});

            // Recent Orders
            const orders = await apiRequest('/api/admin/all-orders');
            allOrders = orders; // Store for filtering
            renderOrders(orders.slice(0, 20)); // Top 20 recent
        } catch (e) { /* handled by apiRequest */ }
    }

    function initDashboardChart(dataObj) {
        const ctx = document.getElementById('dashboard-chart');
        if (!ctx) return;

        const labels = Object.keys(dataObj);
        const data = Object.values(dataObj);

        // Palet Warna Pastel Modern
        const backgroundColors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(201, 203, 207, 0.8)'
        ];

        const borderColors = [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)',
            'rgb(201, 203, 207)'
        ];

        if (dashboardChart) dashboardChart.destroy();

        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tiket Terjual',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.6,
                    hoverBackgroundColor: borderColors // Solid color on hover
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y + ' Tiket';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9',
                            borderDash: [5, 5]
                        },
                        ticks: {
                            stepSize: 1,
                            font: { size: 11 }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { weight: '600' }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    function renderOrders(orders) {
        const tbody = document.getElementById('orders-tbody');
        const now = new Date();

        tbody.innerHTML = orders.map(o => {
            // Check if undo is available (within 5 minutes of being marked as used)
            // QUANTITY CHECK & UNDO LOGIC
            let canUndo = false;
            let diffMinutes = null; // Declare in outer scope for tooltip access
            if (o.status_tiket === 'sudah_dipakai') {
                if (o.dipakai_pada) {
                    // Fix Timezone: If string doesn't specify timezone, assume UTC (server stores UTC)
                    let timeStr = o.dipakai_pada;
                    if (!timeStr.endsWith('Z') && !timeStr.match(/[+-]\d{2}:?\d{2}$/)) {
                        timeStr += 'Z';
                    }

                    const usedAt = new Date(timeStr);
                    const now = new Date(); // Browser local time (compatible with UTC date obj)
                    diffMinutes = (now - usedAt) / (1000 * 60);

                    canUndo = diffMinutes <= 5;
                }
            }

            // Format date
            const orderDate = o.dibuat_pada ? new Date(o.dibuat_pada).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

            // Status badge color
            let statusBg = '#f1f5f9';
            let statusColor = '#64748b';
            if (o.status_tiket === 'berlaku') {
                statusBg = '#dcfce7';
                statusColor = '#16a34a';
            } else if (o.status_tiket === 'sudah_dipakai') {
                statusBg = '#fee2e2';
                statusColor = '#dc2626';
            }

            return `
            <tr>
                <td>
                    <strong>${o.id_pesanan}</strong><br>
                    <small style="color:#94a3b8">${orderDate}</small>
                </td>
                <td>
                    ${o.nama_pelanggan}<br>
                    <small style="color:#64748b">${o.nomor_whatsapp || '-'}</small>
                </td>
                <td>
                    ${(o.detail_item || []).map(i => `${i.quantity}x ${i.name}`).join('<br>')}
                </td>
                <td>
                    <span style="padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; background: ${statusBg}; color: ${statusColor};">
                        ${o.status_tiket.toUpperCase()}
                    </span>
                </td>
                <td style="white-space: nowrap;">
                    ${o.status_tiket === 'berlaku' ?
                    `<button class="btn btn-icon-only btn-primary btn-mark-used" data-id="${o.id_pesanan}" title="Tandai Terpakai" style="width:32px;height:32px;"><i class="fas fa-check"></i></button>` : ''}
                    ${canUndo ?
                    `<button class="btn btn-icon-only btn-warning btn-undo-ticket" data-id="${o.id_pesanan}" title="Undo (Sisa: ${5 - Math.floor(diffMinutes)}m)" style="width:32px;height:32px;background:#f59e0b;"><i class="fas fa-undo"></i></button>` :
                    (o.status_tiket === 'sudah_dipakai' ?
                        `<button class="btn btn-icon-only" disabled 
                            title="Undo tidak tersedia. Diff: ${diffMinutes ? diffMinutes.toFixed(1) + 'm' : 'N/A'}. (Maks 5m)" 
                            style="width:32px;height:32px;background:#cbd5e1;cursor:not-allowed;">
                            <i class="fas fa-undo" style="color:#94a3b8;"></i>
                        </button>` : '')}
                    <button class="btn btn-icon-only btn-danger btn-delete-order" data-id="${o.id_pesanan}" title="Hapus Pesanan" style="width:32px;height:32px;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
        }).join('') || '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8;">Belum ada pesanan</td></tr>';

        // Event Listeners - Mark as Used
        document.querySelectorAll('.btn-mark-used').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm(`Tandai pesanan ${btn.dataset.id} sebagai SUDAH DIPAKAI?`, async () => {
                    await apiRequest('/api/admin/update-ticket-status', {
                        method: 'POST', body: JSON.stringify({ order_id: btn.dataset.id, new_status: 'sudah_dipakai' })
                    });
                    showToast('Status berhasil diupdate', 'success');
                    loadDashboard();
                });
            });
        });

        // Event Listeners - Undo
        document.querySelectorAll('.btn-undo-ticket').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm(`Undo status tiket ${btn.dataset.id}? (Kembalikan ke BERLAKU)`, async () => {
                    await apiRequest('/api/admin/undo-ticket-status', {
                        method: 'POST', body: JSON.stringify({ order_id: btn.dataset.id })
                    });
                    showToast('Status tiket berhasil di-undo', 'success');
                    loadDashboard();
                });
            });
        });

        // Event Listeners - Delete
        document.querySelectorAll('.btn-delete-order').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm(`HAPUS pesanan ${btn.dataset.id}? Stok akan dikembalikan.`, async () => {
                    await apiRequest(`/api/admin/orders/${btn.dataset.id}`, { method: 'DELETE' });
                    showToast('Pesanan berhasil dihapus', 'success');
                    loadDashboard();
                });
            });
        });
    }

    // --- FILTER & SEARCH ---
    let allOrders = [];

    // Initialize year dropdown
    function initOrderFilters() {
        const yearSelect = document.getElementById('filter-year');
        if (yearSelect) {
            const currentYear = new Date().getFullYear();
            for (let y = currentYear; y >= currentYear - 5; y--) {
                const option = document.createElement('option');
                option.value = y;
                option.textContent = y;
                yearSelect.appendChild(option);
            }
        }
    }
    initOrderFilters();

    // Apply Filters Function
    async function applyOrderFilters() {
        const month = document.getElementById('filter-month').value;
        const year = document.getElementById('filter-year').value;
        const status = document.getElementById('filter-status').value;
        const query = document.getElementById('search-input').value.toLowerCase();

        let url = '/api/admin/all-orders';
        const params = [];
        if (month) params.push(`month=${month}`);
        if (year) params.push(`year=${year}`);
        if (params.length > 0) url += '?' + params.join('&');

        try {
            let orders = await apiRequest(url);
            
            // Filter by status on client side
            if (status) {
                orders = orders.filter(o => o.status_tiket === status);
            }

            // Filter by search query
            if (query) {
                orders = orders.filter(o =>
                    o.id_pesanan?.toLowerCase().includes(query) ||
                    o.nama_pelanggan?.toLowerCase().includes(query) ||
                    (o.nomor_whatsapp || '').includes(query)
                );
            }
            
            allOrders = orders;
            renderOrders(orders.slice(0, 50));
        } catch (e) { /* handled */ }
    }

    // Auto-apply filters on change
    document.getElementById('filter-status')?.addEventListener('change', applyOrderFilters);
    document.getElementById('filter-month')?.addEventListener('change', applyOrderFilters);
    document.getElementById('filter-year')?.addEventListener('change', applyOrderFilters);
    
    // Search input with debounce
    let searchTimeout;
    document.getElementById('search-input')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyOrderFilters, 300);
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
                console.log('Edit member data:', data); // Debug
                document.getElementById('edit-member-id').value = data.id;
                document.getElementById('member-name').value = data.name;
                document.getElementById('member-role').value = data.role;
                document.getElementById('member-jiko').value = data.details?.jiko || '';
                document.getElementById('member-instagram').value = data.socials?.instagram || data.details?.instagram || '';
                document.getElementById('member-modal-title').textContent = 'Edit Member';
                
                // Show current photo preview
                const previewContainer = document.getElementById('member-image-preview');
                const previewImg = document.getElementById('member-preview-img');
                const previewText = previewContainer.querySelector('p');
                
                if (data.image_url) {
                    const imgSrc = data.image_url.startsWith('http') ? data.image_url : '../../' + data.image_url;
                    previewImg.src = imgSrc;
                    previewImg.style.display = 'block';
                    previewContainer.style.display = 'block';
                    previewText.textContent = 'Foto saat ini (pilih file baru untuk mengganti)';
                } else {
                    previewImg.style.display = 'none';
                    previewContainer.style.display = 'none';
                }
                document.getElementById('member-image').value = ''; // Reset file input
                
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
        // Hide photo preview for new member
        document.getElementById('member-image-preview').style.display = 'none';
        openModal('member-modal');
    });

    // Live preview when selecting new image
    document.getElementById('member-image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const previewContainer = document.getElementById('member-image-preview');
        const previewImg = document.getElementById('member-preview-img');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                previewImg.src = event.target.result;
                previewContainer.style.display = 'block';
                previewContainer.querySelector('p').textContent = 'Preview foto baru';
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('member-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-member-id').value;
        const name = document.getElementById('member-name').value.trim();
        const role = document.getElementById('member-role').value.trim();
        const jiko = document.getElementById('member-jiko').value;
        const instagram = document.getElementById('member-instagram').value;
        const imageFile = document.getElementById('member-image').files[0];

        // Frontend validation
        if (!name) {
            showToast('Nama member wajib diisi!', 'error');
            return;
        }
        if (!role) {
            showToast('Peran (Gen/Role) wajib diisi! Contoh: Gen 13, Team KIII, Group', 'error');
            document.getElementById('member-role').focus();
            return;
        }

        // Construct FormData if image, else JSON
        let bodyPayload;

        if (imageFile) {
            const formData = new FormData();
            if (id) formData.append('id', id);
            formData.append('name', name);
            formData.append('role', role);
            formData.append('jiko', jiko);
            formData.append('instagram', instagram);
            formData.append('image', imageFile);
            bodyPayload = formData;
        } else {
            bodyPayload = JSON.stringify({
                id, name, role, jiko, instagram // Flattened for server processing
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
    let currentGalleryFilter = 'all';

    async function refreshGalleryMemberSelect() {
        if (allMembersCache.length === 0) {
            try {
                allMembersCache = await apiRequest('/api/admin/members');
            } catch (e) { }
        }
        const select = document.getElementById('gallery-member');
        select.innerHTML = '<option value="">-- Pilih Member --</option>' +
            allMembersCache.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    }

    document.getElementById('gallery-category').addEventListener('change', (e) => {
        const container = document.getElementById('gallery-member-container');
        if (e.target.value === 'member') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
            document.getElementById('gallery-member').value = '';
        }
    });

    async function loadGallery() {
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center;">Loading...</div>';

        try {
            const list = await apiRequest('/api/admin/gallery');

            // Filter by category
            const filtered = currentGalleryFilter === 'all'
                ? list
                : list.filter(g => g.category === currentGalleryFilter);

            if (filtered.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:#94a3b8;">Tidak ada foto dalam kategori ini</div>';
                return;
            }

            grid.innerHTML = filtered.map(g => `
                <div class="gallery-card" style="position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; background:#f1f5f9;">
                    <img src="${g.image_url ? (g.image_url.startsWith('http') ? g.image_url : '../../' + g.image_url) : ''}" style="width:100%; height:100%; object-fit:cover;">
                    <div style="position:absolute; top:5px; left:5px; background:#1e293b; color:white; padding:2px 8px; border-radius:4px; font-size:0.7rem;">
                        ${g.category || 'carousel'}
                    </div>
                    <div style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent, rgba(0,0,0,0.8)); padding:8px; display:flex; justify-content:space-between; align-items:center;">
                        <small style="color:white; font-size:0.75rem;">${g.alt_text || '-'}</small>
                        <div style="display:flex; gap:4px;">
                            <button class="btn-icon-only btn-outline btn-edit-gallery" data-id="${g.id}" data-json='${JSON.stringify(g).replace(/'/g, "&apos;")}' style="background:white; width:28px; height:28px;">
                                <i class="fas fa-edit" style="font-size:0.7rem;"></i>
                            </button>
                            <button class="btn-icon-only btn-danger btn-delete-gallery" data-id="${g.id}" style="width:28px; height:28px;">
                                <i class="fas fa-trash" style="font-size:0.7rem;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Edit Gallery
            document.querySelectorAll('.btn-edit-gallery').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const data = JSON.parse(btn.dataset.json);
                    document.getElementById('edit-gallery-id').value = data.id;
                    document.getElementById('gallery-alt').value = data.alt_text || '';
                    document.getElementById('gallery-category').value = data.category || 'carousel';
                    // document.getElementById('gallery-order').value = data.display_order || 99; // Removed

                    // Show Preview
                    const preview = document.getElementById('gallery-preview-image');
                    const imgSrc = data.image_url ? (data.image_url.startsWith('http') ? data.image_url : '../../' + data.image_url) : '';
                    if (imgSrc) {
                        preview.src = imgSrc;
                        preview.style.display = 'block';
                    } else {
                        preview.style.display = 'none';
                    }

                    document.getElementById('gallery-image').required = false;
                    document.getElementById('gallery-category').disabled = false; // Ensure category is editable

                    // Member Select Logic
                    await refreshGalleryMemberSelect();
                    const memberContainer = document.getElementById('gallery-member-container');
                    const memberSelect = document.getElementById('gallery-member');

                    if (data.category === 'member') {
                        memberContainer.style.display = 'block';
                        memberSelect.value = data.member_id || '';
                    } else {
                        memberContainer.style.display = 'none';
                        memberSelect.value = '';
                    }

                    document.getElementById('gallery-modal-title').textContent = 'Edit Foto';
                    openModal('gallery-modal');
                });
            });

            // Delete Gallery
            document.querySelectorAll('.btn-delete-gallery').forEach(btn => {
                btn.addEventListener('click', () => {
                    showConfirm('Hapus foto ini?', async () => {
                        await apiRequest(`/api/admin/gallery/${btn.dataset.id}`, { method: 'DELETE' });
                        showToast('Foto dihapus', 'success');
                        loadGallery();
                    });
                });
            });
        } catch (e) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#ef4444;">Error loading gallery</div>';
        }
    }

    // Gallery Filter Tabs
    document.querySelectorAll('.gallery-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGalleryFilter = btn.dataset.filter;
            loadGallery();
        });
    });

    document.getElementById('add-gallery-btn').addEventListener('click', async () => {
        document.getElementById('gallery-form').reset();
        document.getElementById('edit-gallery-id').value = '';
        document.getElementById('gallery-image').required = true;
        document.getElementById('gallery-preview-image').style.display = 'none'; // Hide preview

        refreshGalleryMemberSelect();
        document.getElementById('gallery-member-container').style.display = 'none'; // Hidden by default until Member category selected

        document.getElementById('gallery-modal-title').textContent = 'Tambah Foto Baru';
        openModal('gallery-modal');
    });

    document.getElementById('gallery-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-gallery-id').value;
        const img = document.getElementById('gallery-image').files[0];
        const alt = document.getElementById('gallery-alt').value;
        const category = document.getElementById('gallery-category').value;
        const memberId = document.getElementById('gallery-member').value;

        // Determine effective member_id (send '' if not member category or empty)
        const finalMemberId = (category === 'member' && memberId) ? memberId : '';

        try {
            if (id) {
                // UPDATE EXISTING
                if (img) {
                    const fd = new FormData();
                    fd.append('image', img);
                    fd.append('alt_text', alt);
                    fd.append('category', category);
                    fd.append('member_id', finalMemberId); // Always send

                    await apiRequest(`/api/admin/gallery/${id}`, { method: 'PUT', body: fd });
                } else {
                    // JSON update
                    const payload = {
                        alt_text: alt,
                        category,
                        member_id: finalMemberId || null // JSON prefers null over empty string
                    };

                    await apiRequest(`/api/admin/gallery/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                }
            } else {
                // CREATE NEW
                if (!img) {
                    showToast('Pilih file gambar', 'error');
                    return;
                }
                const fd = new FormData();
                fd.append('image', img);
                fd.append('alt_text', alt);
                fd.append('category', category);
                fd.append('member_id', finalMemberId);

                await apiRequest('/api/admin/gallery', { method: 'POST', body: fd });
            }
            showToast('Foto berhasil disimpan', 'success');
            closeModal('gallery-modal');
            loadGallery();
        } catch (err) {
            console.error(err);
            showToast('Gagal menyimpan foto', 'error');
        }
    });





    // --- EVENTS MANAGEMENT ---
    let allMembersCache = [];

    async function loadEvents() {
        const container = document.getElementById('events-list');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">Loading...</div>';
        }

        // Load settings, members, and REAL stock from products
        try {
            const [settingsList, members, productData] = await Promise.all([
                apiRequest('/api/admin/settings'),
                apiRequest('/api/admin/members'),
                fetch('/api/products-and-stock').then(r => r.ok ? r.json() : null).catch(() => null)
            ]);

            allMembersCache = members || [];

            const settings = {};
            (settingsList || []).forEach(item => { settings[item.nama] = item.nilai; });

            const stokEl = document.getElementById('setting-stok');
            const stockDisplayEl = document.getElementById('stock-display');
            const hargaMemberEl = document.getElementById('setting-harga-member');
            const hargaGrupEl = document.getElementById('setting-harga-grup');

            // Use REAL stock from products table (same as cheki.js)
            const realStock = productData?.cheki_stock ?? settings.stok_cheki ?? 0;
            if (stokEl) stokEl.value = realStock;
            if (stockDisplayEl) stockDisplayEl.textContent = realStock;
            if (hargaMemberEl) hargaMemberEl.value = settings.harga_cheki_member || 25000;
            if (hargaGrupEl) hargaGrupEl.value = settings.harga_cheki_grup || 30000;
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }

        // Then load events (separate try-catch so settings still work if events fail)
        if (!container) return;

        try {
            const events = await apiRequest('/api/admin/events');

            if (!events || events.length === 0) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 3rem; margin: 0;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                        <div style="color: #64748b; margin-bottom: 1rem;">Belum ada event</div>
                        <button class="btn btn-primary" onclick="document.getElementById('add-event-btn').click()">
                            <i class="fas fa-plus"></i> Tambah Event Pertama
                        </button>
                    </div>
                `;
                return;
            }

            // Render events list
            container.innerHTML = events.map(ev => {
                const eventDate = new Date(ev.tanggal);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = eventDate < today;
                const dateStr = eventDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

                return `
                    <div class="card" style="margin: 0; ${isPast ? 'opacity: 0.6;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 1.25rem;">🎉</span>
                                    <h4 style="margin: 0; font-weight: 600;">${ev.nama}</h4>
                                    ${isPast ? '<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">SELESAI</span>' : ''}
                                    ${!isPast ? '<span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">UPCOMING</span>' : ''}
                                </div>
                                <div style="color: #64748b; font-size: 0.9rem; display: flex; flex-wrap: wrap; gap: 1rem;">
                                    <span><i class="fas fa-calendar-alt" style="margin-right: 0.25rem;"></i> ${dateStr}</span>
                                    ${ev.lokasi ? `<span><i class="fas fa-map-marker-alt" style="margin-right: 0.25rem;"></i> ${ev.lokasi}</span>` : ''}
                                </div>
                                ${ev.lineup ? `<div style="margin-top: 0.5rem; color: #64748b; font-size: 0.85rem;"><i class="fas fa-microphone-alt" style="margin-right: 0.25rem;"></i> ${ev.lineup}</div>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-outline btn-edit-event" data-id="${ev.id}" data-json='${JSON.stringify(ev).replace(/'/g, "&apos;")}'>
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-danger btn-delete-event" data-id="${ev.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Attach event listeners
            document.querySelectorAll('.btn-edit-event').forEach(btn => {
                btn.addEventListener('click', () => {
                    const data = JSON.parse(btn.dataset.json);
                    document.getElementById('edit-event-id').value = data.id;
                    document.getElementById('event-nama').value = data.nama;
                    document.getElementById('event-tanggal').value = data.tanggal;
                    document.getElementById('event-lokasi').value = data.lokasi || '';
                    document.getElementById('event-deskripsi').value = data.deskripsi || '';
                    document.getElementById('event-modal-title').textContent = 'Edit Event';

                    loadEventLineupCheckboxes(data.lineup || '');
                    openModal('event-modal');
                });
            });

            document.querySelectorAll('.btn-delete-event').forEach(btn => {
                btn.addEventListener('click', () => {
                    showConfirm('Hapus event ini? Tindakan ini tidak dapat dibatalkan.', async () => {
                        await apiRequest(`/api/admin/events/${btn.dataset.id}`, { method: 'DELETE' });
                        showToast('Event berhasil dihapus', 'success');
                        loadEvents();
                    });
                });
            });

        } catch (e) {
            console.warn('Failed to load events:', e);
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 2rem; margin: 0; background: #fef2f2; border-color: #fecaca;">
                    <div style="color: #dc2626; margin-bottom: 0.5rem;"><i class="fas fa-exclamation-triangle"></i> Gagal memuat events</div>
                    <div style="color: #64748b; font-size: 0.85rem;">Pastikan tabel 'events' sudah dibuat di database.</div>
                </div>
            `;
        }
    }

    function loadEventLineupCheckboxes(currentLineup = '') {
        const container = document.getElementById('event-lineup-container');
        const selectedNames = currentLineup.split(',').map(s => s.trim().toLowerCase());

        if (allMembersCache.length === 0) {
            container.innerHTML = '<div style="color:#64748b; font-style:italic; grid-column: 1/-1;">Tidak ada member</div>';
            return;
        }

        container.innerHTML = allMembersCache
            .filter(m => m.member_type !== 'group')
            .map(m => `
                <label style="display:flex; gap:0.5rem; align-items:center; cursor:pointer; font-size:0.85rem; padding:0.25rem; background:white; border-radius:4px;">
                    <input type="checkbox" value="${m.name}" class="event-lineup-checkbox" ${selectedNames.includes(m.name.toLowerCase()) ? 'checked' : ''}>
                    ${m.name}
                </label>
            `).join('');
    }

    // Add Event Button
    document.getElementById('add-event-btn')?.addEventListener('click', () => {
        document.getElementById('event-form').reset();
        document.getElementById('edit-event-id').value = '';
        document.getElementById('event-modal-title').textContent = 'Tambah Event Baru';
        loadEventLineupCheckboxes('');
        openModal('event-modal');
    });

    // Event Form Submit
    document.getElementById('event-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-event-id').value;
        const nama = document.getElementById('event-nama').value;
        const tanggal = document.getElementById('event-tanggal').value;
        const lokasi = document.getElementById('event-lokasi').value;
        const deskripsi = document.getElementById('event-deskripsi').value;
        const lineup = Array.from(document.querySelectorAll('.event-lineup-checkbox:checked'))
            .map(cb => cb.value)
            .join(', ');

        try {
            if (id) {
                // Update existing
                await apiRequest(`/api/admin/events/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ nama, tanggal, lokasi, lineup, deskripsi })
                });
                showToast('Event berhasil diupdate', 'success');
            } else {
                // Create new
                await apiRequest('/api/admin/events', {
                    method: 'POST',
                    body: JSON.stringify({ nama, tanggal, lokasi, lineup, deskripsi })
                });
                showToast('Event berhasil ditambahkan', 'success');
            }
            closeModal('event-modal');
            loadEvents();
        } catch (err) {
            // Error handled by apiRequest
        }
    });


    // --- STOCK MANAGEMENT ---

    async function updateStock(delta) {
        try {
            const result = await apiRequest('/api/admin/update-cheki-stock', {
                method: 'POST',
                body: JSON.stringify({ changeValue: delta })
            });
            showToast(`Stok diperbarui: ${result.newStock}`, 'success');
            return result.newStock;
        } catch (e) {
            showToast('Gagal memperbarui stok', 'error');
            return null;
        }
    }

    // --- STOCK MANAGEMENT (Redesigned UI) ---
    const stockInput = document.getElementById('setting-stok');
    const stockDisplay = document.getElementById('stock-display');

    // Stock Increase Button


    // Set Stock Button - applies the value directly
    document.getElementById('set-stock-btn')?.addEventListener('click', async () => {
        const newValue = parseInt(stockInput?.value, 10);
        if (isNaN(newValue) || newValue < 0) {
            showToast('Masukkan nilai stok yang valid', 'error');
            return;
        }

        try {
            const result = await apiRequest('/api/admin/set-cheki-stock', {
                method: 'POST',
                body: JSON.stringify({ stockValue: newValue })
            });
            showToast(`Stok berhasil diset: ${result.newStock}`, 'success');
            if (stockDisplay) stockDisplay.textContent = result.newStock;
            if (stockInput) stockInput.value = result.newStock;
        } catch (e) {
            showToast('Gagal menyimpan stok', 'error');
        }
    });

    // Settings Save (Price only - stock handled separately)
    document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
        const settings = [
            { nama: 'harga_cheki_member', nilai: document.getElementById('setting-harga-member').value },
            { nama: 'harga_cheki_grup', nilai: document.getElementById('setting-harga-grup').value }
        ];

        try {
            await apiRequest('/api/admin/settings/bulk', {
                method: 'PUT',
                body: JSON.stringify({ settings })
            });
            showToast('Harga berhasil disimpan', 'success');
        } catch (e) {
            showToast('Gagal menyimpan harga', 'error');
        }
    });

    // Keep loadSettings for backward compatibility but redirect to loadEvents
    async function loadSettings() {
        loadEvents();
    }

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
                    // Show OTP Modal with Email info
                    document.getElementById('otp-code-display').textContent = res.code;
                    document.getElementById('otp-target-email').textContent = `Untuk: ${res.email}`;
                    // Store email in dataset for copy button
                    document.getElementById('copy-btn').dataset.email = res.email;

                    openModal('otp-modal');
                });
            });
        });


    }

    // OTP Modal Copy (Enhanced Method 3)
    document.getElementById('copy-btn').addEventListener('click', (e) => {
        const code = document.getElementById('otp-code-display').textContent;
        const email = e.currentTarget.dataset.email || 'user@email.com';

        const message = `Halo, berikut kode reset password Anda:\n\nKode: ${code}\nEmail: ${email}\n\nMohon masukkan URL ini di browser:\n${window.location.origin}/pages/auth/reset-password.html?mode=manual`;

        navigator.clipboard.writeText(message);
        showToast('Pesan lengkap disalin (Kode + Instruksi)', 'success');
    });

    // OTP Modal Close
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        closeModal('otp-modal');
    });

    // LOGOUT
    document.getElementById('admin-logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        showConfirm('Logout dari Admin Panel?', () => {
            localStorage.clear();
            window.location.href = `${basePath}index.html`;
        });
    });

    // --- TESTING CLEANUP ---
    const cleanupButtons = [
        { id: 'btn-cleanup-week', range: 'week', label: 'Hapus data pesanan MINGGU INI?' },
        { id: 'btn-cleanup-month', range: 'month', label: 'Hapus data pesanan BULAN INI?' },
        { id: 'btn-cleanup-year', range: 'year', label: 'Hapus data pesanan TAHUN INI?' },
        { id: 'btn-cleanup-all', range: 'all', label: 'RESET SEMUA data pesanan? (Tidak bisa dikembalikan)' }
    ];

    cleanupButtons.forEach(btn => {
        const el = document.getElementById(btn.id);
        if (el) {
            el.addEventListener('click', () => {
                showConfirm(btn.label, async () => {
                    await apiRequest('/api/admin/cleanup-orders', {
                        method: 'POST',
                        body: JSON.stringify({ range: btn.range })
                    });
                    showToast('Pembersihan data berhasil.', 'success');
                    // Reload dashboard stats if active
                    if (document.getElementById('view-dashboard').classList.contains('active')) loadDashboard();
                    if (document.getElementById('view-event').classList.contains('active')) loadEvents();
                });
            });
        }
    });

    // INIT
    switchView('dashboard');

});