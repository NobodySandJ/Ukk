document.addEventListener('DOMContentLoaded', function () {

    // Fungsi notifikasi (jika diperlukan di halaman ini)
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

    // --- Slider/Carousel Logic ---
    const imageSlider = document.getElementById('image-slider');
    const sliderDots = document.getElementById('slider-dots');
    let sliderImages = [];
    let currentSlide = 0;
    let slideInterval;

    function startSlider(images) {
        if (!imageSlider || !sliderDots) return;
        sliderImages = images;

        // Create slides and dots
        imageSlider.innerHTML = '';
        sliderDots.innerHTML = '';
        sliderImages.forEach((imgSrc, index) => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            slide.innerHTML = `<img src="${imgSrc}" alt="Header Image ${index + 1}">`;
            imageSlider.appendChild(slide);

            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.addEventListener('click', () => {
                goToSlide(index);
                resetInterval();
            });
            sliderDots.appendChild(dot);
        });

        const prevBtn = document.querySelector('.slider-nav .prev-btn');
        const nextBtn = document.querySelector('.slider-nav .next-btn');

        if(prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                goToSlide(currentSlide - 1);
                resetInterval();
            });
    
            nextBtn.addEventListener('click', () => {
                goToSlide(currentSlide + 1);
                resetInterval();
            });
        }

        goToSlide(0);
        slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    }

    function goToSlide(index) {
        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.dot');
        if (slides.length === 0) return;

        currentSlide = (index + slides.length) % slides.length;

        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }
    
    function resetInterval() {
        clearInterval(slideInterval);
        slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    }


    // --- Dynamic Content Loading ---
    async function loadWebsiteData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Gagal mengambil data: ${response.statusText}`);
            }
            const data = await response.json();

            if (!data || !data.group) {
                throw new Error("Format data dari API tidak valid.");
            }
            
            // Periksa apakah elemen ada sebelum memanggil fungsi
            if (document.getElementById('group-name')) {
                populatePage(data);
            }
            if (document.querySelector('.slider-container') && data.gallery) {
                 startSlider(data.gallery.map(item => item.src));
            }


        } catch (error) {
            console.error("Gagal memuat data website:", error);
        }
    }

    function populatePage(data) {
        document.title = `${data.group.name} - Official Website`;
        
        // Header & Hero
        document.querySelector('.logo-text strong').textContent = data.group.name;
        document.getElementById('group-name').textContent = data.group.name;
        document.getElementById('group-tagline').textContent = data.group.tagline;
        document.getElementById('about-content').textContent = data.group.about;

        // Member Section
        const memberGrid = document.getElementById('member-grid');
        if (memberGrid) {
            memberGrid.innerHTML = '';
            data.members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'member-card';
                card.innerHTML = `
                    <img src="${member.image}" alt="${member.name}" loading="lazy">
                    <div class="member-info">
                        <h3>${member.name}</h3>
                        <p>${member.role}</p>
                    </div>
                `;
                memberGrid.appendChild(card);
            });
        }
        
        // News Section
        const newsGrid = document.getElementById('news-grid');
        if (newsGrid) {
            newsGrid.innerHTML = '';
            data.news.forEach(item => {
                const newsLink = document.createElement('a');
                newsLink.className = 'action-button-link';
                newsLink.href = '#'; // Placeholder
                newsLink.textContent = item.title;
                newsGrid.appendChild(newsLink);
            });
        }

        // FAQ Section
        const faqContainer = document.getElementById('faq-container');
        if (faqContainer) {
            faqContainer.innerHTML = '';
            data.faq.forEach(faq => {
                const faqItem = document.createElement('div');
                faqItem.className = 'faq-item';
                faqItem.innerHTML = `<strong>${faq.question}</strong><p>${faq.answer}</p>`;
                faqContainer.appendChild(faqItem);
            });
        }

        // Footer
        const footerText = document.getElementById('footer-text');
        if (footerText) {
            footerText.innerHTML = `&copy; 2025 ${data.group.name}. All Rights Reserved.`;
        }
    }

    // Hamburger Menu Toggle
    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.getElementById('nav-links');
    if(hamburger && navLinks){
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Panggil fungsi utama untuk memuat semua data
    loadWebsiteData();
});