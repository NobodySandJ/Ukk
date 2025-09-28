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

            // Mengisi konten berdasarkan halaman yang aktif
            if (document.getElementById('hero')) {
                populateIndexPage(data);
            }
            if (document.getElementById('gallery-grid')) {
                populateGalleryPage(data);
            }

        } catch (error) {
            console.error("Gagal memuat data website:", error);
            // Tambahkan fallback content jika perlu
        }
    }

    function populateIndexPage(data) {
        document.title = `${data.group.name} (${data.group.name_japanese}) - Official Website`;
        document.querySelector('#logo-title').textContent = data.group.name;
        
        // Cek elemen sebelum mengisi untuk menghindari error
        const heroImage = document.getElementById('hero-image');
        if (heroImage && data.images.hero_background) {
            heroImage.src = data.images.hero_background;
            heroImage.alt = data.group.name;
        }
        
        document.getElementById('about-title').textContent = data.group.name;
        document.getElementById('about-content').textContent = data.group.about;
        document.getElementById('footer-text').innerHTML = `&copy; 2025 ${data.group.name}. All Rights Reserved.`;

        const memberGrid = document.getElementById('member-grid');
        memberGrid.innerHTML = '';
        data.members.forEach(member => {
            const card = document.createElement('div');
            card.className = 'member-card';
            card.innerHTML = `
                <img src="${member.image}" alt="${member.name}" loading="lazy">
                <div class="member-card-header">
                    <h3>${member.name}</h3>
                    <p class="role">${member.role}</p>
                </div>`;
            memberGrid.appendChild(card);
        });
        
        const newsGrid = document.getElementById('news-grid');
        newsGrid.innerHTML = '';
        data.news.forEach(item => {
            const newsLink = document.createElement('a');
            newsLink.className = 'action-button-link';
            newsLink.href = '#'; // Placeholder
            newsLink.textContent = item.title;
            newsGrid.appendChild(newsLink);
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

    function initializeFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            item.querySelector('.faq-question').addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => {
                    i.classList.remove('active');
                    i.querySelector('.faq-answer').style.maxHeight = null;
                });
                if (!isActive) {
                    item.classList.add('active');
                    const answer = item.querySelector('.faq-answer');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        });
    }

    // Panggil fungsi utama
    loadWebsiteData();
});