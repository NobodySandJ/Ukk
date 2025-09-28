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
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Gagal mengambil data: ${response.statusText}`);
            }
            const data = await response.json();

            if (!data || !data.group) {
                throw new Error("Format data dari API tidak valid.");
            }

            if (document.getElementById('hero')) {
                populateIndexPage(data);
            }

        } catch (error) {
            console.error("Gagal memuat data website:", error);
        }
    }

    function populateIndexPage(data) {
        document.title = `${data.group.name} - Official Website`;
        
        // Header & Hero
        document.querySelector('.logo-text strong').textContent = data.group.name;
        document.getElementById('hero-image').src = data.images.hero_background;
        document.getElementById('hero-image').alt = data.group.name;
        document.getElementById('group-name').textContent = data.group.name;
        document.getElementById('group-tagline').textContent = data.group.tagline;
        document.getElementById('about-content').textContent = data.group.about;

        // Member Section
        const memberGrid = document.getElementById('member-grid');
        memberGrid.innerHTML = ''; // Kosongkan grid sebelum mengisi
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
        
        // News Section
        const newsGrid = document.getElementById('news-grid');
        newsGrid.innerHTML = ''; // Kosongkan grid
        data.news.forEach(item => {
            const newsLink = document.createElement('a');
            newsLink.className = 'action-button-link';
            newsLink.href = '#'; // Placeholder
            newsLink.textContent = item.title;
            newsGrid.appendChild(newsLink);
        });

        // FAQ Section
        const faqContainer = document.getElementById('faq-container');
        if (faqContainer && data.faq) {
            faqContainer.innerHTML = ''; // Kosongkan kontainer
            data.faq.forEach(faq => {
                const faqItem = document.createElement('div');
                faqItem.className = 'faq-item';
                faqItem.innerHTML = `<strong>${faq.question}</strong><p>${faq.answer}</p>`;
                faqContainer.appendChild(faqItem);
            });
        }

        // Footer
        document.getElementById('footer-text').innerHTML = `&copy; 2025 ${data.group.name}. All Rights Reserved.`;
    }

    // Panggil fungsi utama
    loadWebsiteData();

    // Hamburger Menu Toggle
    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.getElementById('nav-links');
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});