document.addEventListener('DOMContentLoaded', () => {
    // Pastikan kode ini hanya berjalan di halaman galeri
    if (!document.getElementById('gallery-page')) {
        return;
    }

    const galleryGrid = document.getElementById('gallery-grid');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = lightbox.querySelector('.close-btn');
    const prevBtn = lightbox.querySelector('.prev-btn');
    const nextBtn = lightbox.querySelector('.next-btn');

    let galleryData = [];
    let currentIndex = 0;

    // Fungsi untuk memuat gambar dari data.json
    async function loadGalleryImages() {
        if (!galleryGrid) return;

        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Gagal mengambil data galeri: ${response.statusText}`);
            }
            const data = await response.json();
            galleryData = data.gallery || [];

            if (galleryData.length === 0) {
                galleryGrid.innerHTML = '<p>Tidak ada gambar di galeri.</p>';
                return;
            }

            renderGallery();
        } catch (error) {
            console.error(error);
            galleryGrid.innerHTML = `<p>Gagal memuat galeri. Silakan coba lagi nanti.</p>`;
        }
    }

    // Fungsi untuk menampilkan gambar ke dalam grid
    function renderGallery() {
        galleryGrid.innerHTML = '';
        galleryData.forEach((item, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.innerHTML = `
                <img src="${item.src}" alt="${item.alt}" loading="lazy">
                <div class="gallery-item-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            `;
            galleryItem.addEventListener('click', () => openLightbox(index));
            galleryGrid.appendChild(galleryItem);
        });
    }

    // Fungsi untuk membuka lightbox
    function openLightbox(index) {
        currentIndex = index;
        updateLightboxImage();
        lightbox.classList.add('active');
    }

    // Fungsi untuk menutup lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
    }

    // Fungsi untuk memperbarui gambar dan caption di lightbox
    function updateLightboxImage() {
        const item = galleryData[currentIndex];
        lightboxImg.src = item.src;
        lightboxCaption.textContent = item.alt;
    }

    // Fungsi navigasi lightbox
    function showNextImage() {
        currentIndex = (currentIndex + 1) % galleryData.length;
        updateLightboxImage();
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
        updateLightboxImage();
    }

    // Event Listeners untuk lightbox
    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNextImage);
    prevBtn.addEventListener('click', showPrevImage);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Panggil fungsi utama
    loadGalleryImages();
});