// Konfigurasi dasar buat path file, biar ga error pas di subfolder
// Menggunakan window.basePath untuk menghindari konflik saat multiple script di-load
if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || './';
}
var basePath = window.basePath;

// Fungsi buat nampilin notifikasi toast (popup kecil di pojok kanan atas)
function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Ikon sesuai tipe notifikasi
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    // Otomatis ilang setelah beberapa detik
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

document.addEventListener('DOMContentLoaded', function () {

    // Slider gambar otomatis buat di homepage
    function startSlider(imageSources) {
        const slider = document.getElementById('image-slider');
        const dotsContainer = document.getElementById('slider-dots');
        const prevBtn = document.querySelector('.slider-nav .prev-btn');
        const nextBtn = document.querySelector('.slider-nav .next-btn');

        if (!slider || !dotsContainer || imageSources.length === 0) return;

        let currentSlide = 0;
        let autoSlideInterval;

        // Bersihin dulu konten lama biar ga numpuk
        slider.innerHTML = '';
        dotsContainer.innerHTML = '';

        imageSources.forEach((src, index) => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            slide.innerHTML = `<img src="${src}" alt="Gallery image ${index + 1}">`;
            slider.appendChild(slide);

            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.addEventListener('click', () => {
                goToSlide(index);
                resetAutoSlide();
            });
            dotsContainer.appendChild(dot);
        });

        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.dot');

        function goToSlide(slideIndex) {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            currentSlide = (slideIndex + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        }

        const nextSlide = () => goToSlide(currentSlide + 1);
        const prevSlide = () => goToSlide(currentSlide - 1);

        function startAutoSlide() {
            autoSlideInterval = setInterval(nextSlide, 5000); // Ganti slide tiap 5 detik
        }

        function resetAutoSlide() {
            clearInterval(autoSlideInterval);
            startAutoSlide();
        }

        if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoSlide(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoSlide(); });

        goToSlide(0);
        startAutoSlide();
    }


    // ============================================================
    // RENDER SKELETONS (HOMEPAGE)
    // ============================================================
    function renderHomepageSkeletons() {
        const memberGrid = document.getElementById('member-grid');
        const galleryGrid = document.getElementById('gallery-preview-grid');

        if (memberGrid) {
            memberGrid.innerHTML = '';
            // Group Card Skeleton
            const groupSkeleton = document.createElement('div');
            groupSkeleton.className = 'member-card-detailed skeleton';
            groupSkeleton.innerHTML = `
                <div class="skeleton-rect" style="width: 120px; height: 120px; flex-shrink: 0;"></div>
                <div style="flex: 1; padding: 1rem;">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text-short"></div>
                </div>
            `;
            memberGrid.appendChild(groupSkeleton);

            // Member Card Skeletons
            for (let i = 0; i < 3; i++) {
                const card = document.createElement('div');
                card.className = 'member-card-detailed skeleton';
                card.innerHTML = `
                    <div class="skeleton-avatar" style="width: 100px; height: 100px; border-radius: 8px;"></div>
                    <div style="flex: 1; padding-left: 1rem;">
                        <div class="skeleton-title" style="height: 1.5rem;"></div>
                        <div class="skeleton-text"></div>
                    </div>
                `;
                memberGrid.appendChild(card);
            }
        }

        if (galleryGrid) {
            galleryGrid.innerHTML = '';
            for (let i = 0; i < 4; i++) {
                const item = document.createElement('div');
                item.className = 'gallery-preview-item skeleton';
                item.innerHTML = `<div class="skeleton-rect"></div>`;
                galleryGrid.appendChild(item);
            }
        }
    }

    // ============================================================
    // FUNGSI LOAD DATA WEBSITE
    // UPDATED: Mengambil data dari API (dengan Supabase members) atau fallback ke data.json
    // ============================================================
    async function loadWebsiteData() {
        try {
            // Try fetching from API first (supports dynamic members from Supabase)
            let data;
            let nextEvent = null;

            // Render Skeletons
            renderHomepageSkeletons();

            try {
                const [productsRes, eventRes] = await Promise.all([
                    fetch('/api/products-and-stock'),
                    fetch('/api/public/next-event')
                ]);

                if (productsRes.ok) {
                    data = await productsRes.json();
                }

                if (eventRes.ok) {
                    nextEvent = await eventRes.json();
                }
            } catch (apiError) {
                console.error('API Error:', apiError);
                // No fallback available since data.json is deleted.
                // UI will handle empty state.
            }

            if (!data) throw new Error("Gagal memuat data dari API");

            // Add next event to data object
            if (nextEvent) {
                data.nextEvent = nextEvent;
            }

            populatePage(data);

            // Inisialisasi slider jika ada
            if (document.querySelector('.slider-container') && data.gallery) {
                startSlider(data.gallery.map(item => {
                    const src = (item.src || item.image_url || '').trim();
                    return (src.startsWith('http://') || src.startsWith('https://')) ? src : basePath + src;
                }));
            }

        } catch (error) {
            console.error("Failed to load website data:", error);
        }
    }

    // ============================================================
    // FUNGSI POPULATE PAGE
    // Mengisi konten halaman dengan data dari JSON
    // Edit bagian ini untuk mengubah tampilan data
    // ============================================================
    function populatePage(data) {
        document.title = `${data.group.name} - Official Website`;

        const safeSetText = (selector, text) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = text;
        };

        // Header & Hero Section
        safeSetText('.logo-text strong', data.group.name);
        safeSetText('#group-name', data.group.name);
        safeSetText('#group-tagline', data.group.tagline);
        safeSetText('#about-content', data.group.about);

        // --- Section: Cara Memesan ---
        const howToOrderContainer = document.getElementById('how-to-order-container');
        if (howToOrderContainer && data.how_to_order) {
            howToOrderContainer.innerHTML = data.how_to_order.map((step, index) => `
                <div class="order-step">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-details">
                        <h3>${step.title}</h3>
                        <p>${step.description}</p>
                    </div>
                </div>
            `).join('');
        }

        // --- Section: Member ---
        // Edit di sini untuk mengubah tampilan kartu member
        const memberGrid = document.getElementById('member-grid');
        if (memberGrid) {
            memberGrid.innerHTML = '';

            // Kartu Grup
            const groupCard = document.createElement('div');
            groupCard.className = 'member-card-detailed group-card';
            // Handle both full URLs (Supabase) and relative paths - with defensive coding
            const groupImgSrc = data.group_cheki?.image
                ? (data.group_cheki.image.startsWith('http') ? data.group_cheki.image : basePath + data.group_cheki.image)
                : basePath + 'img/member/group.webp';

            groupCard.innerHTML = `
                <img src="${groupImgSrc}" alt="${data.group.name}" loading="lazy" onerror="this.src='${basePath}img/placeholder.png'">
                <div class="member-details">
                    <h3>${data.group.name}</h3>
                    <blockquote class="jiko">"${data.group.tagline}"</blockquote>
                    <p>${data.group.about}</p>
                </div>`;
            memberGrid.appendChild(groupCard);

            // Kartu Member Individual
            data.members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'member-card-detailed';
                // Handle both full URLs (Supabase) and relative paths (data.json)
                const imgSrc = (member.image || '').startsWith('http') ? member.image : basePath + member.image;
                const details = member.details || {};
                card.innerHTML = `
                    <img src="${imgSrc}" alt="${member.name}" loading="lazy" onerror="this.src='${basePath}img/placeholder.png'">
                    <div class="member-details">
                        <span class="role">${member.role || 'Member'}</span>
                        <h3>${member.name}</h3>
                        <blockquote class="jiko">"${details.jiko || ''}"</blockquote>
                        <ul>
                            <li><strong>Sifat:</strong> ${details.sifat || '-'}</li>
                            <li><strong>Hobi:</strong> ${details.hobi || '-'}</li>
                        </ul>
                        ${details.instagram ? `
                        <div style="margin-top: 1rem;">
                            <a href="${details.instagram}" target="_blank" class="btn btn-outline" style="width:100%; justify-content:center; gap:0.5rem; font-size:0.9rem;">
                                <i class="fab fa-instagram"></i> Follow Instagram
                            </a>
                        </div>
                        ` : ''}
                    </div>`;
                memberGrid.appendChild(card);
            });
        }

        // --- Section: Next Event Card ---
        const eventContainer = document.getElementById('next-event-container');
        if (eventContainer) {
            // Use nextEvent from events table API
            const event = data.nextEvent;

            // Only show if event exists with name and date
            if (event && event.nama && event.tanggal) {
                // Format date to Indonesian
                const eventDate = new Date(event.tanggal);
                const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                const formattedDate = `${days[eventDate.getDay()]}, ${eventDate.getDate()} ${months[eventDate.getMonth()]} ${eventDate.getFullYear()}`;

                // Parse lineup - match with members data
                const lineupNames = (event.lineup || '').split(',').map(s => s.trim()).filter(s => s);
                const lineupMembers = lineupNames.map(name => {
                    const member = (data.members || []).find(m =>
                        m.name.toLowerCase() === name.toLowerCase()
                    );
                    return {
                        name: name,
                        image: member ? (member.image.startsWith('http') ? member.image : basePath + member.image) : `${basePath}img/member/placeholder.webp`
                    };
                });

                let lineupHTML = '';
                if (lineupMembers.length > 0) {
                    lineupHTML = `
                        <div class="event-lineup-section">
                            <div class="event-lineup-label"><i class="fas fa-microphone-alt"></i> Lineup Member</div>
                            <div class="event-lineup-grid">
                                ${lineupMembers.map(m => `
                                    <div class="lineup-member">
                                        <img src="${m.image}" alt="${m.name}" class="lineup-member-avatar" onerror="this.src='${basePath}img/member/placeholder.webp'">
                                        <span class="lineup-member-name">${m.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                eventContainer.innerHTML = `
                    <div class="next-event-card">
                        <span class="event-badge">Event Mendatang</span>
                        <h3 class="event-title">${event.nama}</h3>
                        <div class="event-details">
                            <div class="event-detail-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>${formattedDate}</span>
                            </div>
                            ${event.lokasi ? `
                            <div class="event-detail-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${event.lokasi}</span>
                            </div>
                            ` : ''}
                        </div>
                        ${lineupHTML}
                        <a href="${basePath}pages/public/cheki.html" class="event-cta">
                            <i class="fas fa-ticket-alt"></i> Beli Tiket Cheki
                        </a>
                    </div>
                `;
            } else {
                eventContainer.innerHTML = '';
            }
        }

        // --- Section: Berita ---
        const newsContainer = document.getElementById('news-container');
        if (newsContainer && data.news) {
            newsContainer.innerHTML = data.news.map(item => `
                <div class="news-item">
                    <h3>${item.title}</h3>
                    <div class="date">${item.date}</div>
                    <p>${item.content}</p>
                </div>
            `).join('');
        }

        // --- Section: FAQ ---
        const faqContainer = document.getElementById('faq-container');
        if (faqContainer) {
            faqContainer.innerHTML = data.faq.map(faq => `
                <div class="faq-item">
                    <div class="faq-question">${faq.question}</div>
                    <div class="faq-answer"><p>${faq.answer}</p></div>
                </div>
            `).join('');

            // Toggle FAQ
            faqContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('faq-question')) {
                    e.target.parentElement.classList.toggle('active');
                }
            });
        }

        // Footer
        safeSetText('#footer-text', `© 2025 ${data.group.name}. All Rights Reserved.`);
    }

    // ============================================================
    // FUNGSI LEADERBOARD HOMEPAGE
    // Menampilkan Top 3 Spender di halaman utama
    // ============================================================
    async function fetchHomepageLeaderboard() {
        const container = document.getElementById('homepage-leaderboard');
        if (!container) return;

        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) throw new Error('Fetch failed');
            const data = await response.json();

            // Tampilan jika belum ada data atau data bukan array
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem 2rem; background: linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%); border-radius: var(--border-radius-lg); border: 2px dashed rgba(251, 191, 36, 0.3);">
                        <div style="font-size: 4rem; margin-bottom: 1rem; animation: float 3s ease-in-out infinite;">🏆</div>
                        <h3 style="color: var(--text-color); font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 700;">Belum Ada Top Spender</h3>
                        <p style="color: var(--secondary-text-color); font-size: 1rem; margin-bottom: 1.5rem;">Jadilah yang pertama mendukung member favorit kamu!</p>
                        <a href="${basePath}pages/public/cheki.html" class="cta-button" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-star"></i> Beli Cheki Sekarang
                        </a>
                    </div>`;
                return;
            }

            // Tampilkan Top 3
            const rankEmojis = ['🥇', '🥈', '🥉'];
            container.innerHTML = `
                <div class="homepage-leaderboard-grid">
                    ${data.slice(0, 3).map((user, index) => `
                        <div class="leaderboard-card rank-${index + 1}">
                            <div class="leaderboard-rank">${rankEmojis[index]}</div>
                            <div class="leaderboard-name">${user.username}</div>
                            <div class="leaderboard-oshi">❤️ ${user.oshi || 'All Member'}</div>
                            <div class="leaderboard-count">${user.totalQuantity || user.totalCheki || 0} Cheki</div>
                        </div>
                    `).join('')}
                </div>`;

        } catch (error) {
            console.error('Leaderboard error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 2rem; background: rgba(239, 68, 68, 0.05); border-radius: var(--border-radius-lg); border: 2px solid rgba(239, 68, 68, 0.2);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem; display: block;"></i>
                    <h3 style="color: var(--text-color); font-size: 1.2rem; margin-bottom: 0.5rem; font-weight: 600;">Gagal Memuat Leaderboard</h3>
                    <p style="color: var(--secondary-text-color); margin-bottom: 1.5rem;">Sepertinya ada masalah koneksi. Silakan coba lagi nanti.</p>
                    <button onclick="window.location.reload()" class="cta-button secondary" style="background: transparent; color: var(--primary-color); border: 2px solid var(--primary-color); display: inline-flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-redo"></i> Muat Ulang
                    </button>
                </div>`;
        }
    }

    // ============================================================
    // TOGGLE MENU MOBILE (HAMBURGER) - Enhanced for Android/iOS
    // ============================================================
    const hamburger = document.getElementById('hamburger-menu');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        // Create overlay element for closing menu when tapping outside (invisible, just for tap detection)
        let overlay = document.getElementById('nav-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'nav-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
                z-index: 999;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            `;
            document.body.appendChild(overlay);
        }

        // Toggle menu function
        const toggleMenu = (show) => {
            if (show) {
                navMenu.classList.add('active');
                overlay.style.opacity = '1';
                overlay.style.visibility = 'visible';
                document.body.style.overflow = 'hidden'; // Prevent scroll when menu open
            } else {
                navMenu.classList.remove('active');
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
                document.body.style.overflow = ''; // Restore scroll
            }
        };

        // Hamburger click opens menu
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMenu.classList.contains('active');
            toggleMenu(!isOpen);
        });

        // Clicking overlay closes menu
        overlay.addEventListener('click', () => toggleMenu(false));

        // Close button inside menu
        navMenu.addEventListener('click', (e) => {
            if (e.target.closest('#mobile-menu-close')) {
                toggleMenu(false);
            }
        });

        // Close menu when any link is clicked
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });
    }

    // ============================================================
    // FUNGSI GALERI PREVIEW HOMEPAGE
    // Menampilkan foto dari folder dokumentasi
    // ============================================================
    async function loadGalleryPreview() {
        const container = document.getElementById('gallery-preview-grid');
        if (!container) return;

        try {
            // Use API instead of deleted JSON file
            const response = await fetch('/api/public/gallery');
            if (!response.ok) throw new Error('Fetch failed');
            const data = await response.json();

            // Filter foto dokumentasi yang valid (bukan placeholder)
            const dokumentasi = (data || []).filter(item =>
                item.image_url && !item.image_url.includes('example.webp') &&
                (item.category === 'dokumentasi' || item.category === 'event')
            ).map(item => ({
                src: item.image_url,
                title: item.alt_text || 'Gallery'
            }));

            // Jika tidak ada foto, tampilkan pesan
            if (dokumentasi.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: rgba(22, 163, 74, 0.05); border-radius: 16px; border: 2px dashed rgba(22, 163, 74, 0.2);">
                        <i class="fas fa-images" style="font-size: 3rem; color: var(--primary-color); opacity: 0.5; margin-bottom: 1rem;"></i>
                        <p style="color: var(--secondary-text-color); font-size: 1.1rem;">Foto belum tersedia</p>
                    </div>
                `;
                return;
            }

            // Tampilkan maksimal 4 foto
            const photos = dokumentasi.slice(0, 4);
            container.innerHTML = photos.map((item, index) => {
                const isLast = index === photos.length - 1 && dokumentasi.length > 4;
                const extraStyle = isLast ? 'filter: brightness(0.5);' : '';
                const overlay = isLast ? `
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">
                        <i class="fas fa-images" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                        <p style="font-weight: 600;">+${dokumentasi.length - 3} Lainnya</p>
                    </div>
                ` : '';

                // Fix: Handle both HTTP and HTTPS URLs
                const imgSrc = (item.src || '').trim();
                const finalSrc = (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) ? imgSrc : basePath + imgSrc;

                return `
                    <div class="gallery-preview-item" style="position: relative; cursor: pointer;" onclick="window.location.href='${basePath}pages/public/gallery.html'">
                        <img src="${finalSrc}" alt="${item.title}" style="${extraStyle}" loading="lazy">
                        ${overlay}
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Gallery preview error:', error);
            // Better empty state with call-to-action
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: linear-gradient(135deg, rgba(22, 163, 74, 0.05) 0%, rgba(52, 211, 153, 0.05) 100%); border-radius: 16px; border: 2px dashed rgba(22, 163, 74, 0.2);">
                    <i class="fas fa-images" style="font-size: 3.5rem; color: var(--primary-color); opacity: 0.6; margin-bottom: 1rem; display: block;"></i>
                    <h3 style="color: var(--text-color); font-size: 1.2rem; margin-bottom: 0.5rem; font-weight: 600;">Galeri Foto Segera Hadir</h3>
                    <p style="color: var(--secondary-text-color); font-size: 0.95rem; margin-bottom: 1.5rem;">Kami sedang mempersiapkan momen-momen terbaik untuk kalian</p>
                    <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #059669 0%, #34d399 100%); border-radius: 12px; opacity: 0.3;"></div>
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #059669 0%, #34d399 100%); border-radius: 12px; opacity: 0.2;"></div>
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #059669 0%, #34d399 100%); border-radius: 12px; opacity: 0.1;"></div>
                    </div>
                </div>
            `;
        }
    }

    // ============================================================
    // FUNGSI BUTTON LAPOR BUG FLOATING
    // ============================================================
    function createFloatingBugButton() {
        // Jangan tampilkan di halaman admin
        if (window.location.pathname.includes('/pages/admin/')) return;
        
        // Cek kalo udah ada biar ga double
        if (document.getElementById('floating-bug-btn')) return;

        const btn = document.createElement('a');
        btn.id = 'floating-bug-btn';
        btn.className = 'floating-bug-btn';
        // Format WA link
        btn.href = 'https://wa.me/6285765907580?text=Halo%20Admin%20Refresh%20Breeze%2C%20saya%20ingin%20melaporkan%20bug%20di%20website';
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.innerHTML = '<i class="fab fa-whatsapp"></i> Lapor Bug';

        document.body.appendChild(btn);
    }

    // ============================================================
    // INISIALISASI HOMEPAGE
    // ============================================================
    // Jalankan di semua halaman (kecuali admin)
    createFloatingBugButton();

    if (document.querySelector('#hero')) {
        loadWebsiteData();
        fetchHomepageLeaderboard();
        loadGalleryPreview();
    }
});