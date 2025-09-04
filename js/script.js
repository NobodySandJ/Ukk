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
        document.querySelector('#logo-title a').textContent = data.group.name;
        document.getElementById('hero-title').textContent = data.group.name;
        document.getElementById('hero-tagline').textContent = data.group.tagline;
        document.getElementById('about-title').innerHTML = `Tentang ${data.group.name} (${data.group.name_japanese})`;
        document.getElementById('about-content').innerHTML = data.group.about;
        document.getElementById('footer-text').innerHTML = `&copy; 2025 ${data.group.name}. All Rights Reserved.`;

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
            // --- KODE HTML YANG DIPERBARUI UNTUK STRUKTUR KARTU ---
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
            // --- AKHIR PERUBAHAN ---
            memberGrid.appendChild(card);
        });

        // Data Berita
        const newsGrid = document.getElementById('news-grid');
        newsGrid.innerHTML = '';
        data.news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item reveal';
            newsItem.innerHTML = `
                <h3>${item.title}</h3>
                <p>${item.content}</p>
                <span class="date">${item.date}</span>
            `;
            newsGrid.appendChild(newsItem);
        });
    }

    // --- [BARU] FUNGSI UNTUK MENGISI KONTEN HALAMAN GALERI ---
    function populateGalleryPage(data) {
        const galleryGrid = document.getElementById('gallery-grid');
        galleryGrid.innerHTML = ''; // Kosongkan dulu
        if (data.gallery && Array.isArray(data.gallery)) {
            data.gallery.forEach(image => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.innerHTML = `<img src="${image.src}" alt="${image.alt}">`;
                galleryGrid.appendChild(galleryItem);
            });
        }
        // Setelah galeri dibuat, inisialisasi lagi lightbox
        initializeLightbox();
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
    
    // --- [MODIFIKASI] KODE LIGHTBOX DIPISAHKAN KE FUNGSI SENDIRI ---
    function initializeLightbox() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const closeBtn = document.querySelector('.close-btn');

        if (galleryItems.length > 0 && lightbox) {
            galleryItems.forEach(item => {
                item.addEventListener('click', () => {
                    const img = item.querySelector('img');
                    if(img) {
                        lightbox.style.display = 'block';
                        lightboxImg.src = img.src; 
                    }
                });
            });
            if (closeBtn) {
                closeBtn.addEventListener('click', () => { lightbox.style.display = 'none'; });
            }
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) { lightbox.style.display = 'none'; }
            });
        }
    }

    // Panggil lightbox untuk halaman non-galeri (jika ada)
    initializeLightbox();

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