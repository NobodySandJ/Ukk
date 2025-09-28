document.addEventListener('DOMContentLoaded', function () {
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
            faqContainer.addEventListener('click', function(e) {
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
    const navLinks = document.getElementById('nav-links');
    if(hamburger && navLinks){
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
    
    // Panggil fungsi utama jika ini adalah halaman utama
    if (document.querySelector('#hero')) { // Cek elemen yang hanya ada di index.html
        loadWebsiteData();
    }
});

// REVISI: Fungsi notifikasi global yang bisa diakses file lain
function showToast(message, isSuccess = true, duration = 4000) {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    toast.innerHTML = message;
    
    toast.style.backgroundColor = isSuccess ? 'var(--success-color)' : '#D33333';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}