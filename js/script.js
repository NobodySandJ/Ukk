function showToast(message, isSuccess = true) {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.backgroundColor = isSuccess ? 'var(--success-color)' : '#D33333';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}


document.addEventListener('DOMContentLoaded', function () {
    // Kode pendaftaran Service Worker telah dihapus dari sini

    async function loadWebsiteData() {
        try {
            const response = await fetch('/api/products-and-stock');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (!data || !data.group) {
                throw new Error("Format data.json tidak valid atau data gagal dimuat.");
            }

            // Menampilkan stok di index.html
            const indexStockDisplay = document.getElementById('index-stock-display');
            if (indexStockDisplay) {
                indexStockDisplay.textContent = `${data.cheki_stock} tiket`;
            }

            if (document.getElementById('hero')) {
                populateIndexPage(data);
            }
            if (document.getElementById('gallery-grid')) {
                populateGalleryPage(data);
            }

        } catch (error) {
            console.error("Could not load website data:", error);
            if (document.getElementById('hero-title')) {
                document.getElementById('hero-title').textContent = "Gagal Memuat Konten";
            }
             if (document.getElementById('about-title')) {
                document.getElementById('about-title').textContent = "Konten tidak tersedia";
            }
        }
    }

    function populateIndexPage(data) {
        document.title = `${data.group.name} (${data.group.name_japanese}) - Official Website`;
        const logoTitle = document.querySelector('#logo-title a');
        if (logoTitle) logoTitle.textContent = data.group.name;

        document.getElementById('hero-title').textContent = data.group.name;
        document.getElementById('about-title').innerHTML = `Tentang ${data.group.name} (${data.group.name_japanese})`;
        document.querySelector('.about-tagline').textContent = data.group.tagline;
        document.getElementById('about-content').innerHTML = data.group.about;

        const footerText = document.querySelector('#footer-text');
        if (footerText) footerText.innerHTML = `&copy; 2025 ${data.group.name}. All Rights Reserved.`;

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

        const faqContainer = document.querySelector('.faq-container');
        if (faqContainer && data.faq) {
            faqContainer.innerHTML = '';
            data.faq.forEach(faq => {
                const faqItem = document.createElement('div');
                faqItem.className = 'faq-item';
                faqItem.innerHTML = `
                    <button class="faq-question">
                        <span>${faq.question}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="faq-answer">
                        <p>${faq.answer}</p>
                    </div>
                `;
                faqContainer.appendChild(faqItem);
            });
            initializeFaqAccordion();
        }
    }

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

    function initializeLightbox(galleryData) {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox) return;

        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const closeBtn = document.querySelector('.close-btn');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const galleryItems = document.querySelectorAll('.gallery-item');
        let currentIndex = 0;

        function showImage(index) {
            if (!galleryData || galleryData.length === 0) return;
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

        const showNext = () => showImage(currentIndex + 1);
        const showPrev = () => showImage(currentIndex - 1);

        if (prevBtn) prevBtn.addEventListener('click', showPrev);
        if (nextBtn) nextBtn.addEventListener('click', showNext);

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (lightbox.classList.contains('active')) {
                if (e.key === 'ArrowLeft') showPrev();
                if (e.key === 'ArrowRight') showNext();
                if (e.key === 'Escape') closeLightbox();
            }
        });

        let touchstartX = 0;
        let touchendX = 0;

        function handleGesture() {
            if (touchendX < touchstartX - 50) showNext();
            if (touchendX > touchstartX + 50) showPrev();
        }

        lightbox.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, { passive: true });

        lightbox.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleGesture();
        }, { passive: true });
    }

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
    
    function initializeFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');

            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                faqItems.forEach(otherItem => {
                    if(otherItem !== item) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-answer').style.maxHeight = 0;
                    }
                });

                if (isActive) {
                    item.classList.remove('active');
                    answer.style.maxHeight = 0;
                } else {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        });
    }
});