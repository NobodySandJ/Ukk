document.addEventListener('DOMContentLoaded', function() {

    // --- FUNGSI UTAMA UNTUK MEMUAT DATA DINAMIS ---
    async function loadWebsiteData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Cek halaman mana yang sedang aktif
            if (document.getElementById('hero')) {
                populateIndexPage(data);
            }
            if (document.getElementById('gallery-grid')) {
                populateGalleryPage(data);
            }

        } catch (error) {
            console.error("Could not load website data:", error);
        }
    }

    // --- FUNGSI UNTUK MENGISI KONTEN HALAMAN INDEX ---
    function populateIndexPage(data) {
        // Data Grup
        document.title = `${data.group.name} (${data.group.name_japanese}) - Official Website`;
        const logoTitle = document.querySelector('.logo-link');
        if (logoTitle) logoTitle.textContent = data.group.name;

        document.getElementById('hero-title').textContent = data.group.name;
        document.getElementById('hero-tagline').textContent = data.group.tagline;
        document.getElementById('about-title').innerHTML = `Tentang ${data.group.name} (${data.group.name_japanese})`;
        document.getElementById('about-content').innerHTML = data.group.about;
        
        const footerText = document.querySelector('footer p');
        if (footerText) footerText.innerHTML = `&copy; 2025 ${data.group.name}. All Rights Reserved.`;


        // Set Latar Belakang Hero
        const heroSection = document.getElementById('hero');
        if (data.images && data.images.hero_background) {
            heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${data.images.hero_background}')`;
        }

        // Data Member
        const memberGrid = document.getElementById('member-grid');
        memberGrid.innerHTML = '';
        data.members.forEach(member => {
            const card = document.createElement('div');
            card.className = 'member-card reveal';
            card.innerHTML = `
                <img src="${member.image}" alt="${member.name}">
                <div class="member-card-header">
                    <h3>${member.name}</h3>
                    <p class="role">${member.role}</p>
                </div>
                <div class="member-details">
                    <p><strong>Sifat:</strong> ${member.details.sifat}</p>
                    <p><strong>Hobi:</strong> ${member.details.hobi}</p>
                    <p class="jiko">${member.details.jiko}</p>
                </div>
            `;
            memberGrid.appendChild(card);
        });

        // Data Berita (UPDATED)
        const newsGrid = document.getElementById('news-grid');
        newsGrid.innerHTML = '';
        data.news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item reveal';
            newsItem.innerHTML = `
                <div class="news-item-content">
                    <h3>${item.title}</h3>
                    <p>${item.content}</p>
                </div>
                <span class="date"><i class="fas fa-calendar-alt"></i>${item.date}</span>
            `;
            newsGrid.appendChild(newsItem);
        });
    }

    // --- FUNGSI UNTUK MENGISI KONTEN HALAMAN GALERI ---
    function populateGalleryPage(data) {
        const galleryGrid = document.getElementById('gallery-grid');
        galleryGrid.innerHTML = '';
        if (data.gallery && Array.isArray(data.gallery)) {
            data.gallery.forEach((image, index) => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                // Tambahkan data-index untuk navigasi lightbox
                galleryItem.setAttribute('data-index', index);
                galleryItem.innerHTML = `<img src="${image.src}" alt="${image.alt}">`;
                galleryGrid.appendChild(galleryItem);
            });
        }
        // Kirim data galeri ke fungsi inisialisasi lightbox
        initializeLightbox(data.gallery);
    }

    // Panggil fungsi untuk memuat data saat halaman dimuat
    loadWebsiteData();

    // --- KODE UNTUK MENU HAMBURGER MOBILE ---
    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            if (navLinks.classList.contains('active')) {
                navLinks.querySelectorAll('li').forEach((li, index) => {
                    li.style.setProperty('--i', index);
                });
            }
        });
    }
    
    // --- [MODIFIKASI] KODE LIGHTBOX DENGAN FITUR BARU ---
    function initializeLightbox(galleryData) {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return; // Keluar jika tidak ada lightbox di halaman

        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const closeBtn = document.querySelector('.close-btn');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const galleryItems = document.querySelectorAll('.gallery-item');
        let currentIndex = 0;

        function showImage(index) {
            if (index >= galleryData.length) index = 0;
            if (index < 0) index = galleryData.length - 1;
            
            const image = galleryData[index];
            lightboxImg.src = image.src;
            lightboxCaption.textContent = image.alt;
            currentIndex = index;
        }
        
        function openLightbox(index) {
            lightbox.classList.add('active');
            showImage(index);
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
        }

        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.getAttribute('data-index'), 10);
                openLightbox(index);
            });
        });

        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        if (prevBtn) prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => showImage(currentIndex + 1));
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        // Navigasi dengan keyboard
        document.addEventListener('keydown', (e) => {
            if (lightbox.classList.contains('active')) {
                if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
                if (e.key === 'ArrowRight') showImage(currentIndex + 1);
                if (e.key === 'Escape') closeLightbox();
            }
        });
    }

    // --- FUNGSI UNTUK ANIMASI ON SCROLL ---
    function reveal() {
      const reveals = document.querySelectorAll(".reveal");
      for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        const elementTop = reveals[i].getBoundingClientRect().top;
        const elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
          reveals[i].classList.add("active");
        }
      }
    }
    window.addEventListener("scroll", reveal);
    reveal();
});