// Logika buat halaman Galeri
// Nampilin foto member, group, sama event
// Datanya diambil dari API database
if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || '../../';
}
var basePath = window.basePath;

document.addEventListener('DOMContentLoaded', async () => {
    // Cek dulu ada elemen galeri gak, biar gak error di halaman lain
    if (!document.querySelector('.gallery-hero')) {
        return;
    }

    // URL for dynamic member fetch
    const MEMBERS_API = '/api/public/members';
    let members = []; // Will be populated from API

    // Ambil elemen-elemen HTML yang bakal diisi (Moved to top to fix ReferenceError)
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

    // Tempat nyimpen data galeri
    let galleryData = {
        group: [],
        member: {},
        dokumentasi: []
    };

    // Helper to get image filename
    const getImgKey = (path) => {
        if (!path) return '';
        const parts = path.split('/');
        const filename = parts[parts.length - 1];
        return filename.split('.')[0];
    };

    // ============================================================
    // FUNGSI RENDER SKELETON
    // ============================================================
    function renderGallerySkeletons() {
        const containers = [groupGallery, memberGallery, eventGallery];
        containers.forEach(container => {
            if (container) {
                container.innerHTML = '';
                for (let i = 0; i < 4; i++) {
                    const div = document.createElement('div');
                    div.className = 'gallery-item skeleton';
                    div.style.aspectRatio = '1/1';
                    div.style.height = '250px';
                    div.innerHTML = '<div class="skeleton-rect"></div>';
                    container.appendChild(div);
                }
            }
        });
    }

    // ============================================================
    // FUNGSI FETCH DATA
    // ============================================================
    async function loadData() {
        try {
            renderGallerySkeletons();

            // 1. Fetch Members List (Dynamic)
            const membersRes = await fetch(MEMBERS_API);
            if (membersRes.ok) {
                const membersData = await membersRes.json();
                members = membersData.map(m => ({
                    name: m.name,
                    id: m.id, // Store ID for exact matching
                    imgKey: getImgKey(m.image_url),
                    image_url: m.image_url
                }));
            }

            // 2. Fetch Gallery Images
            const response = await fetch('/api/public/gallery');
            if (response.ok) {
                const flatData = await response.json();
                galleryData = { group: [], member: {}, dokumentasi: [] };
                members.forEach(m => galleryData.member[m.id] = []);

                flatData.forEach(item => {
                    const src = item.image_url || '';
                    const lowerSrc = src.toLowerCase();
                    const galleryItem = {
                        src: src,
                        title: item.alt_text || 'Foto Gallery',
                        description: item.alt_text || '',
                        date: 'Terbaru',
                        size: 'medium',
                        category: item.category || 'unknown'
                    };

                    let isMember = false;

                    if (galleryItem.category === 'member') {
                        let matchedById = false;

                        // 1. EXACT MATCH by Member ID (New accurate method)
                        if (item.member_id) {
                            const m = members.find(mem => mem.id === item.member_id);
                            if (m) {
                                if (!galleryData.member[m.id]) galleryData.member[m.id] = [];
                                galleryData.member[m.id].push(galleryItem);
                                isMember = true;
                                matchedById = true;
                            }
                        }

                        // 2. FUZZY MATCH (Fallback for old photos without ID)
                        if (!matchedById) {
                            members.forEach(m => {
                                // MATCHING LOGIC:
                                // A. Check if Gallery Title (Alt Text) contains Member Name
                                // B. Check if Gallery Filename contains Member Profile Filename
                                const nameMatch = galleryItem.title.toLowerCase().includes(m.name.toLowerCase());
                                const imgKeyMatch = lowerSrc.includes(m.imgKey.toLowerCase());

                                if (nameMatch || (imgKeyMatch && m.imgKey.length > 3)) {
                                    if (!galleryData.member[m.id]) galleryData.member[m.id] = [];

                                    const exists = galleryData.member[m.id].some(i => i.src === galleryItem.src);
                                    if (!exists) {
                                        galleryData.member[m.id].push(galleryItem);
                                        isMember = true;
                                    }
                                }
                            });
                        }
                    } else if (galleryItem.category === 'group' || galleryItem.category === 'grup') {
                        galleryData.group.push(galleryItem);
                    } else if (galleryItem.category === 'dokumentasi' || galleryItem.category === 'event') {
                        galleryData.dokumentasi.push(galleryItem);
                    } else {
                        members.forEach(m => {
                            if (lowerSrc.includes(m.imgKey.toLowerCase())) {
                                if (galleryData.member[m.id]) { // Check if ID key exists
                                    // Avoid duplicates
                                    const exists = galleryData.member[m.id].some(i => i.src === galleryItem.src);
                                    if (!exists) {
                                        galleryData.member[m.id].push(galleryItem);
                                        isMember = true;
                                    }
                                }
                            }
                        });

                        if (!isMember) {
                            if (lowerSrc.includes('group') || lowerSrc.includes('grup')) {
                                galleryData.group.push(galleryItem);
                            } else if (galleryItem.category !== 'carousel') {
                                galleryData.dokumentasi.push(galleryItem);
                            }
                        }
                    }
                });
            } else {
                throw new Error("API response not ok");
            }

            // Render content after fetch
            renderMemberAvatars();
            renderGallery(groupGallery, galleryData.group || [], 'group');
            renderMemberPhotos();
            renderGallery(eventGallery, galleryData.dokumentasi || [], 'event');
            updateStats();

        } catch (error) {
            console.error('Gagal memuat data:', error);
            // Show error state if needed
        }
    }

    // ============================================================
    // FUNGSI RENDER MEMBER AVATARS (SELECTOR)
    // ============================================================
    function renderMemberAvatars() {
        if (!memberAvatars) return;
        memberAvatars.innerHTML = '';

        const allBtn = document.createElement('div');
        allBtn.className = 'member-avatar all-btn active';
        allBtn.dataset.member = 'all';
        allBtn.innerHTML = '<span>Semua</span>';
        allBtn.addEventListener('click', () => selectMember('all'));
        memberAvatars.appendChild(allBtn);

        if (members.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.gridColumn = '1/-1';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#64748b';
            emptyMsg.style.fontSize = '0.9rem';
            emptyMsg.innerHTML = '<em>Member belum ditambahkan. Cek Admin Panel.</em>';
            memberAvatars.appendChild(emptyMsg);
            return;
        }

        members.forEach(member => {
            const avatar = document.createElement('div');
            avatar.className = 'member-avatar';
            avatar.dataset.member = member.id; // Use ID as key
            const imgSrc = member.image_url?.startsWith('http') ? member.image_url : basePath + (member.image_url ? member.image_url.replace(/^\//, '') : `img/member/${member.imgKey}.webp`);

            avatar.innerHTML = `
                <img src="${imgSrc}" alt="${member.name}" loading="lazy">
                <span class="member-name">${member.name}</span>
            `;
            avatar.addEventListener('click', () => selectMember(member.id));
            memberAvatars.appendChild(avatar);
        });
    }

    // ============================================================
    // FUNGSI SELECT MEMBER
    // ============================================================
    function selectMember(memberKey) {
        selectedMember = memberKey;
        document.querySelectorAll('.member-avatar').forEach(avatar => {
            avatar.classList.toggle('active', avatar.dataset.member === memberKey);
        });
        renderMemberPhotos();
    }

    // ============================================================
    // FUNGSI RENDER MEMBER PHOTOS
    // ============================================================
    function renderMemberPhotos() {
        if (!memberGallery) return;
        let photosToShow = [];
        if (selectedMember === 'all') {
            Object.values(galleryData.member || {}).forEach(memberPhotos => {
                photosToShow = photosToShow.concat(memberPhotos);
            });
        } else {
            photosToShow = (galleryData.member && galleryData.member[selectedMember]) || [];
        }
        renderGallery(memberGallery, photosToShow, 'member');
        const memberCount = document.getElementById('member-count');
        if (memberCount) memberCount.textContent = photosToShow.length;
    }

    // ============================================================
    // FUNGSI RENDER GALERI
    // ============================================================
    function renderGallery(container, items, category) {
        if (!container) return;
        container.innerHTML = '';
        const validItems = items.filter(item => item.src && !item.src.includes('example.webp'));

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
        let totalMemberPhotos = 0;
        Object.values(galleryData.member || {}).forEach(memberPhotos => {
            totalMemberPhotos += memberPhotos.length;
        });
        const groupPhotos = (galleryData.group || []).length;
        const dokPhotos = (galleryData.dokumentasi || []).filter(d => !d.src.includes('example.webp')).length;
        const totalPhotos = groupPhotos + totalMemberPhotos + dokPhotos;

        document.getElementById('total-photos').textContent = totalPhotos;
        document.getElementById('total-events').textContent = dokPhotos;
        if (document.getElementById('event-count')) {
            document.getElementById('event-count').textContent = dokPhotos;
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
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', prevImage);
    if (nextBtn) nextBtn.addEventListener('click', nextImage);

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        }
    });

    // ============================================================
    // INISIALISASI
    // ============================================================
    loadData();

});
