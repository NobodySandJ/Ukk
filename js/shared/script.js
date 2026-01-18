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
    // FUNGSI LOAD DATA WEBSITE
    // UPDATED: Mengambil data dari API (dengan Supabase members) atau fallback ke data.json
    // ============================================================
    async function loadWebsiteData() {
        try {
            // Try fetching from API first (supports dynamic members from Supabase)
            let data;
            try {
                const response = await fetch('/api/products-and-stock');
                if (response.ok) {
                    data = await response.json();
                }
            } catch (apiError) {
                console.log('API not available, falling back to data.json');
            }

            // Fallback to data.json if API fails
            if (!data || !data.group) {
                const fallbackResponse = await fetch(`${basePath}data.json`);
                if (!fallbackResponse.ok) throw new Error(`Fetch error: ${fallbackResponse.statusText}`);
                data = await fallbackResponse.json();
            }

            if (!data || !data.group) throw new Error("Invalid data format");

            populatePage(data);

            // Inisialisasi slider jika ada
            if (document.querySelector('.slider-container') && data.gallery) {
                startSlider(data.gallery.map(item => {
                    const src = item.src || item.image_url || '';
                    return src.startsWith('http') ? src : basePath + src;
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
            // Handle both full URLs (Supabase) and relative paths
            const groupImgSrc = (data.group_cheki.image || '').startsWith('http') ? data.group_cheki.image : basePath + data.group_cheki.image;

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
                    </div>`;
                memberGrid.appendChild(card);
            });
        }

        // --- Section: Berita ---
        const newsContainer = document.getElementById('news-container');
        if (newsContainer) {
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
                    <div style="text-align: center; padding: 2rem; color: var(--secondary-text-color);">
                        <p style="font-size: 3rem; margin-bottom: 1rem;">🏆</p>
                        <p>Belum ada Top Spender saat ini.</p>
                        <p style="margin-top: 0.5rem;">Jadilah yang pertama!</p>
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
                <div style="text-align: center; padding: 2rem; color: var(--secondary-text-color);">
                    <p>Tidak dapat memuat leaderboard.</p>
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
                z-index: 1000;
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
            const response = await fetch(`${basePath}data/gallery-data.json`);
            if (!response.ok) throw new Error('Fetch failed');
            const data = await response.json();

            // Filter foto dokumentasi yang valid (bukan placeholder)
            const dokumentasi = (data.dokumentasi || []).filter(item =>
                item.src && !item.src.includes('example.webp')
            );

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

                return `
                    <div style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); aspect-ratio: 1; position: relative; cursor: pointer;" onclick="window.location.href='${basePath}pages/public/gallery.html'">
                        <img src="${basePath}${item.src}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover; ${extraStyle}" loading="lazy">
                        ${overlay}
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Gallery preview error:', error);
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: rgba(22, 163, 74, 0.05); border-radius: 16px; border: 2px dashed rgba(22, 163, 74, 0.2);">
                    <i class="fas fa-images" style="font-size: 3rem; color: var(--primary-color); opacity: 0.5; margin-bottom: 1rem;"></i>
                    <p style="color: var(--secondary-text-color); font-size: 1.1rem;">Foto belum tersedia</p>
                </div>
            `;
        }
    }

    // ============================================================
    // INISIALISASI HOMEPAGE
    // ============================================================
    if (document.querySelector('#hero')) {
        loadWebsiteData();
        fetchHomepageLeaderboard();
        loadGalleryPreview();
    }
});