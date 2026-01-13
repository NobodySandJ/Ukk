// ============================ 
// TOAST NOTIFICATION (MERGED)
// ============================
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to container
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================ 
// MAIN SCRIPT
// ============================
document.addEventListener('DOMContentLoaded', function () {


    // --- FUNGSI SLIDER GAMBAR ---
    // Logika ini dipindahkan ke sini untuk memperbaiki error 'startSlider is not defined'
    function startSlider(imageSources) {
        const slider = document.getElementById('image-slider');
        const dotsContainer = document.getElementById('slider-dots');
        const prevBtn = document.querySelector('.slider-nav .prev-btn');
        const nextBtn = document.querySelector('.slider-nav .next-btn');

        if (!slider || !dotsContainer || imageSources.length === 0) {
            return;
        }

        let currentSlide = 0;
        let autoSlideInterval;

        // Buat slide dan dots
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

        function nextSlide() {
            goToSlide(currentSlide + 1);
        }

        function prevSlide() {
            goToSlide(currentSlide - 1);
        }

        function startAutoSlide() {
            autoSlideInterval = setInterval(nextSlide, 5000);
        }

        function resetAutoSlide() {
            clearInterval(autoSlideInterval);
            startAutoSlide();
        }

        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoSlide();
        });

        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoSlide();
        });

        goToSlide(0);
        startAutoSlide();
    }


    // --- FUNGSI PEMUATAN DATA WEBSITE ---
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

            // Panggil fungsi untuk mengisi konten halaman
            populatePage(data);

            // Panggil fungsi slider jika ada galeri
            if (document.querySelector('.slider-container') && data.gallery) {
                startSlider(data.gallery.map(item => item.src)); // INI PERBAIKANNYA
            }

        } catch (error) {
            console.error("Gagal memuat data website:", error);
        }
    }

    function populatePage(data) {
        document.title = `${data.group.name} - Official Website`;

        // Header & Hero
        const logoText = document.querySelector('.logo-text strong');
        if (logoText) logoText.textContent = data.group.name;

        const groupName = document.getElementById('group-name');
        if (groupName) groupName.textContent = data.group.name;

        const groupTagline = document.getElementById('group-tagline');
        if (groupTagline) groupTagline.textContent = data.group.tagline;

        const aboutContent = document.getElementById('about-content');
        if (aboutContent) aboutContent.textContent = data.group.about;

        // How to Order Section
        const howToOrderContainer = document.getElementById('how-to-order-container');
        if (howToOrderContainer && data.how_to_order) {
            howToOrderContainer.innerHTML = '';
            data.how_to_order.forEach((step, index) => {
                const stepEl = document.createElement('div');
                stepEl.className = 'order-step';
                stepEl.innerHTML = `
                    <div class="step-number">${index + 1}</div>
                    <div class="step-details">
                        <h3>${step.title}</h3>
                        <p>${step.description}</p>
                    </div>
                `;
                howToOrderContainer.appendChild(stepEl);
            });
        }

        // Member Section
        const memberGrid = document.getElementById('member-grid');
        if (memberGrid) {
            memberGrid.innerHTML = '';

            const groupCard = document.createElement('div');
            groupCard.className = 'member-card-detailed group-card';
            groupCard.innerHTML = `
                <img src="${data.group_cheki.image}" alt="${data.group.name}" loading="lazy">
                <div class="member-details">
                    <h3>${data.group.name}</h3>
                    <blockquote class="jiko">"${data.group.tagline}"</blockquote>
                    <p>${data.group.about}</p>
                </div>
            `;

            const allElements = [groupCard];

            data.members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'member-card-detailed';
                card.innerHTML = `
                    <img src="${member.image}" alt="${member.name}" loading="lazy">
                    <div class="member-details">
                        <span class="role">${member.role}</span>
                        <h3>${member.name}</h3>
                        <blockquote class="jiko">"${member.details.jiko}"</blockquote>
                        <ul>
                            <li><strong>Sifat:</strong> ${member.details.sifat}</li>
                            <li><strong>Hobi:</strong> ${member.details.hobi}</li>
                        </ul>
                    </div>
                `;
                allElements.push(card);
            });

            allElements.forEach(element => {
                memberGrid.appendChild(element);
            });
        }

        // News Section
        const newsContainer = document.getElementById('news-container');
        if (newsContainer) {
            newsContainer.innerHTML = '';
            data.news.forEach(item => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';
                newsItem.innerHTML = `
                    <h3>${item.title}</h3>
                    <div class="date">${item.date}</div>
                    <p>${item.content}</p>
                `;
                newsContainer.appendChild(newsItem);
            });
        }

        // FAQ Section
        const faqContainer = document.getElementById('faq-container');
        if (faqContainer) {
            faqContainer.innerHTML = '';
            data.faq.forEach(faq => {
                const faqItem = document.createElement('div');
                faqItem.className = 'faq-item';
                faqItem.innerHTML = `
                    <div class="faq-question">${faq.question}</div>
                    <div class="faq-answer"><p>${faq.answer}</p></div>`;
                faqContainer.appendChild(faqItem);
            });
            faqContainer.addEventListener('click', function (e) {
                const question = e.target.closest('.faq-question');
                if (question) {
                    question.parentElement.classList.toggle('active');
                }
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
    const navMenu = document.getElementById('nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Panggil fungsi utama jika ini adalah halaman utama (index.html)
    if (document.querySelector('#hero')) {
        loadWebsiteData();
    }
});