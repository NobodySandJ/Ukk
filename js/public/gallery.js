// Logika buat halaman Galeri
// Nampilin foto member, group, sama event
// Datanya diambil dari file JSON terpisah biar gampang update
const basePath = window.appBasePath || '../../';

document.addEventListener('DOMContentLoaded', async () => {
    // Cek dulu ada elemen galeri gak, biar gak error di halaman lain
    if (!document.querySelector('.gallery-hero')) {
        return;
    }

    // Tempat nyimpen data galeri
    let galleryData = {
        group: [],
        member: {},
        dokumentasi: []
    };

    try {
        const response = await fetch(basePath + 'data/gallery-data.json');
        if (response.ok) {
            galleryData = await response.json();
        }
    } catch (error) {
        console.warn('Tidak dapat memuat gallery-data.json, menggunakan data default');
    }

    // List member buat filter, key-nya harus sama kayak nama file gambar
    const members = [
        { name: 'Aca', imgKey: 'aca' },
        { name: 'Sinta', imgKey: 'sinta' },
        { name: 'Cissi', imgKey: 'cissi' },
        { name: 'Channie', imgKey: 'channie' },
        { name: 'Cally', imgKey: 'cally' },
        { name: 'Yanyee', imgKey: 'yanyee' },
        { name: 'Piya', imgKey: 'piya' }
    ];

    // Ambil elemen-elemen HTML yang bakal diisi
    const groupGallery = document.getElementById('group-gallery');
    const memberGallery = document.getElementById('member-gallery');
    const memberAvatars = document.getElementById('member-avatars');
    const eventGallery = document.getElementById('event-gallery');
    const filterButtons = document.querySelectorAll('.filter-tab');

    const groupSection = document.getElementById('group-section');
    const memberSection = document.getElementById('member-section');
    const eventSection = document.getElementById('event-section');

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const closeBtn = lightbox.querySelector('.close-btn');
    const prevBtn = lightbox.querySelector('.prev-btn');
    const nextBtn = lightbox.querySelector('.next-btn');

    let allImages = [];
    let currentIndex = 0;
    let selectedMember = 'all';

    // ============================================================
    // FUNGSI RENDER MEMBER AVATARS (SELECTOR)
    // ============================================================
    function renderMemberAvatars() {
        if (!memberAvatars) return;

        memberAvatars.innerHTML = '';

        // Tombol "Semua"
        const allBtn = document.createElement('div');
        allBtn.className = 'member-avatar all-btn active';
        allBtn.dataset.member = 'all';
        allBtn.innerHTML = '<span>Semua</span>';
        allBtn.addEventListener('click', () => selectMember('all'));
        memberAvatars.appendChild(allBtn);

        // Avatar setiap member
        members.forEach(member => {
            const avatar = document.createElement('div');
            avatar.className = 'member-avatar';
            avatar.dataset.member = member.imgKey;
            avatar.innerHTML = `
                <img src="${basePath}img/member/${member.imgKey}.webp" alt="${member.name}" loading="lazy">
                <span class="member-name">${member.name}</span>
            `;
            avatar.addEventListener('click', () => selectMember(member.imgKey));
            memberAvatars.appendChild(avatar);
        });
    }

    // ============================================================
    // FUNGSI SELECT MEMBER
    // ============================================================
    function selectMember(memberKey) {
        selectedMember = memberKey;

        // Update avatar active state
        document.querySelectorAll('.member-avatar').forEach(avatar => {
            avatar.classList.toggle('active', avatar.dataset.member === memberKey);
        });

        // Render foto berdasarkan member yang dipilih
        renderMemberPhotos();
    }

    // ============================================================
    // FUNGSI RENDER MEMBER PHOTOS (FILTERED)
    // ============================================================
    function renderMemberPhotos() {
        if (!memberGallery) return;

        let photosToShow = [];

        if (selectedMember === 'all') {
            // Tampilkan semua foto member
            Object.values(galleryData.member || {}).forEach(memberPhotos => {
                photosToShow = photosToShow.concat(memberPhotos);
            });
        } else {
            // Tampilkan foto dari member yang dipilih saja
            photosToShow = (galleryData.member && galleryData.member[selectedMember]) || [];
        }

        renderGallery(memberGallery, photosToShow, 'member');

        // Update count
        const memberCount = document.getElementById('member-count');
        if (memberCount) {
            memberCount.textContent = photosToShow.length;
        }
    }

    // ============================================================
    // FUNGSI RENDER GALERI
    // ============================================================
    function renderGallery(container, items, category) {
        if (!container) return;
        container.innerHTML = '';

        // Filter out placeholder items
        const validItems = items.filter(item =>
            item.src && !item.src.includes('example.webp')
        );

        if (validItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <p>Belum ada foto dalam kategori ini.</p>
                </div>
            `;
            return;
        }

        validItems.forEach((item, index) => {
            const div = document.createElement('div');
            const isLandscape = category === 'group';
            div.className = `gallery-item ${item.size || ''} ${isLandscape ? 'landscape' : ''}`;
            const imgSrc = item.src.startsWith('http') ? item.src : basePath + item.src;
            div.innerHTML = `
                <img src="${imgSrc}" alt="${item.title}" loading="lazy">
                <div class="gallery-overlay">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <div class="date"><i class="fas fa-calendar-alt"></i> ${item.date}</div>
                </div>
            `;
            div.addEventListener('click', () => openLightbox(validItems, index));
            container.appendChild(div);
        });
    }

    // ============================================================
    // FUNGSI UPDATE STATISTIK
    // ============================================================
    function updateStats() {
        // Hitung total foto member
        let totalMemberPhotos = 0;
        Object.values(galleryData.member || {}).forEach(memberPhotos => {
            totalMemberPhotos += memberPhotos.length;
        });

        const groupPhotos = (galleryData.group || []).length;
        const dokPhotos = (galleryData.dokumentasi || []).filter(d => !d.src.includes('example.webp')).length;
        const totalPhotos = groupPhotos + totalMemberPhotos + dokPhotos;

        document.getElementById('total-photos').textContent = totalPhotos;
        document.getElementById('total-events').textContent = dokPhotos;

        const eventCount = document.getElementById('event-count');
        if (eventCount) {
            eventCount.textContent = dokPhotos;
        }
    }

    // ============================================================
    // FUNGSI FILTER
    // ============================================================
    function applyFilter(filter) {
        if (groupSection) groupSection.style.display = (filter === 'all' || filter === 'group') ? 'block' : 'none';
        if (memberSection) memberSection.style.display = (filter === 'all' || filter === 'member') ? 'block' : 'none';
        if (eventSection) eventSection.style.display = (filter === 'all' || filter === 'event') ? 'block' : 'none';
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilter(btn.dataset.filter);
        });
    });

    // ============================================================
    // FUNGSI LIGHTBOX
    // ============================================================
    function openLightbox(images, index) {
        allImages = images;
        currentIndex = index;
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateLightboxImage() {
        const item = allImages[currentIndex];
        lightboxImg.src = item.src.startsWith('http') ? item.src : basePath + item.src;
        lightboxImg.alt = item.title;
        lightboxTitle.textContent = item.title;
        lightboxDesc.textContent = item.description;
    }

    function nextImage() {
        currentIndex = (currentIndex + 1) % allImages.length;
        updateLightboxImage();
    }

    function prevImage() {
        currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
        updateLightboxImage();
    }

    // Event Listeners Lightbox
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', prevImage);
    nextBtn.addEventListener('click', nextImage);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });

    // ============================================================
    // INISIALISASI
    // ============================================================
    renderMemberAvatars();
    renderGallery(groupGallery, galleryData.group || [], 'group');
    renderMemberPhotos();
    renderGallery(eventGallery, galleryData.dokumentasi || [], 'event');
    updateStats();
});