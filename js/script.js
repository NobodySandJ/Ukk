// Fungsi notifikasi terpusat yang bisa dipanggil dari script lain
function showToast(message, isSuccess = true, duration = 3000) {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    if (/<[a-z][\s\S]*>/i.test(message)) {
        toast.innerHTML = message;
    } else {
        toast.textContent = message;
    }
    
    toast.style.backgroundColor = isSuccess ? 'var(--success-color)' : '#D33333';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    const finalDuration = toast.querySelector('.toast-actions') ? 10000 : duration;

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, finalDuration);
}

document.addEventListener('DOMContentLoaded', function () {

    // Mengambil semua data dari backend
    async function loadWebsiteData() {
        try {
            const response = await fetch('/api/products-and-stock');
            if (!response.ok) {
                throw new Error(`Gagal mengambil data: ${response.statusText}`);
            }
            const data = await response.json();

            if (!data || !data.group) {
                throw new Error("Format data dari API tidak valid.");
            }

            // Update stok di halaman utama
            const indexStockDisplay = document.getElementById('index-stock-display');
            if (indexStockDisplay) {
                indexStockDisplay.textContent = `${data.cheki_stock} tiket`;
            }

            // Mengisi konten berdasarkan halaman yang aktif
            if (document.getElementById('hero')) {
                populateIndexPage(data);
            }
            if (document.getElementById('gallery-grid')) {
                populateGalleryPage(data);
            }

        } catch (error) {
            console.error("Gagal memuat data website:", error);
            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) heroTitle.textContent = "Konten Gagal Dimuat";
        }
    }

    // Mengisi konten untuk halaman utama (index.html)
    function populateIndexPage(data) {
        document.title = `${data.group.name} (${data.group.name_japanese}) - Official Website`;
        document.querySelector('#logo-title a').textContent = data.group.name;
        document.getElementById('hero-title').textContent = data.group.name;
        document.getElementById('about-title').innerHTML = `Tentang ${data.group.name} (${data.group.name_japanese})`;
        document.querySelector('.about-tagline').textContent = data.group.tagline;
        document.getElementById('about-content').innerHTML = data.group.about;
        document.querySelector('#footer-text').innerHTML = `&copy; 2025 ${data.group.name}. All Rights Reserved.`;

        const heroSection = document.getElementById('hero');
        if (data.images && data.images.hero_background) {
            heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${data.images.hero_background}')`;
        }

        const memberGrid = document.getElementById('member-grid');
        memberGrid.innerHTML = '';
        data.members.forEach(member => {
            const card = document.createElement('div');
            card.className = 'member-card reveal';
            card.innerHTML = `
                <img src="${member.image}" alt="${member.name}" loading="lazy">
                <div class="member-card-header"><h3>${member.name}</h3><p class="role">${member.role}</p></div>
                <div class="member-details">
                    <p><strong>Sifat:</strong> ${member.details.sifat}</p>
                    <p><strong>Hobi:</strong> ${member.details.hobi}</p>
                    <p class="jiko">${member.details.jiko}</p>
                </div>`;
            memberGrid.appendChild(card);
        });
        
        const newsGrid = document.getElementById('news-grid');
        newsGrid.innerHTML = '';
        data.news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item reveal';
            newsItem.innerHTML = `<div class="news-item-content"><h3>${item.title}</h3><p>${item.content}</p></div><span class="date"><i class="fas fa-calendar-alt"></i>${item.date}</span>`;
            newsGrid.appendChild(newsItem);
        });

        const faqContainer = document.querySelector('.faq-container');
        if (faqContainer && data.faq) {
            faqContainer.innerHTML = '';
            data.faq.forEach(faq => {
                const faqItem = document.createElement('div');
                faqItem.className = 'faq-item';
                faqItem.innerHTML = `<button class="faq-question"><span>${faq.question}</span><i class="fas fa-chevron-down"></i></button><div class="faq-answer"><p>${faq.answer}</p></div>`;
                faqContainer.appendChild(faqItem);
            });
            initializeFaqAccordion();
        }
    }

    // Mengisi konten untuk halaman galeri (gallery.html)
    function populateGalleryPage(data) {
        const galleryGrid = document.getElementById('gallery-grid');
        galleryGrid.innerHTML = '';
        if (data.gallery && Array.isArray(data.gallery)) {
            data.gallery.forEach((image, index) => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.setAttribute('data-index', index);
                galleryItem.innerHTML = `<img src="${image.src}" alt="${image.alt}" loading="lazy">`;
                galleryGrid.appendChild(galleryItem);
            });
        }
        initializeLightbox(data.gallery);
    }
    
    loadWebsiteData();

    // Inisialisasi menu hamburger
    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            if (navLinks.classList.contains('active')) {
                navLinks.querySelectorAll('li').forEach((li, index) => li.style.setProperty('--i', index));
            }
        });
    }

    // Inisialisasi galeri lightbox
    function initializeLightbox(galleryData) {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;

        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const galleryItems = document.querySelectorAll('.gallery-item');
        let currentIndex = 0;

        const showImage = (index) => {
            if (!galleryData || galleryData.length === 0) return;
            currentIndex = (index + galleryData.length) % galleryData.length;
            const image = galleryData[currentIndex];
            lightboxImg.src = image.src;
            lightboxCaption.textContent = image.alt;
        };

        const openLightbox = (index) => {
            lightbox.classList.add('active');
            showImage(index);
        };

        const closeLightbox = () => lightbox.classList.remove('active');

        galleryItems.forEach(item => item.addEventListener('click', () => openLightbox(parseInt(item.dataset.index, 10))));
        
        lightbox.querySelector('.close-btn').addEventListener('click', closeLightbox);
        lightbox.querySelector('.prev-btn').addEventListener('click', () => showImage(currentIndex - 1));
        lightbox.querySelector('.next-btn').addEventListener('click', () => showImage(currentIndex + 1));
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        document.addEventListener('keydown', (e) => {
            if (lightbox.classList.contains('active')) {
                if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
                if (e.key === 'ArrowRight') showImage(currentIndex + 1);
                if (e.key === 'Escape') closeLightbox();
            }
        });
    }

    // Inisialisasi animasi saat scroll
    function reveal() {
        document.querySelectorAll(".reveal").forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight - 100) {
                el.classList.add("active");
            }
        });
    }
    window.addEventListener("scroll", reveal);
    reveal();
    
    // Inisialisasi accordion untuk FAQ
    function initializeFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            item.querySelector('.faq-question').addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => {
                    i.classList.remove('active');
                    i.querySelector('.faq-answer').style.maxHeight = 0;
                });
                if (!isActive) {
                    item.classList.add('active');
                    const answer = item.querySelector('.faq-answer');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        });
    }
});